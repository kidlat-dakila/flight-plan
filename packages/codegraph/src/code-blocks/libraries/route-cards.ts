import type { SyntaxNode } from "@/ast-graph/parser"
import { METHOD_SEPARATOR, type MatchedSlot, type PatternMatch } from "@/catalogue/matching/match-sites"
import type { SlotRuns } from "@/catalogue/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { BlockCard, CardPart, SourceRange } from "@/code-blocks/types"
import { childrenOf, innermostAround, innermostAt, innermostCallableAround, outermostAt } from "./read-blocks"
import type { CardReading, CardSeed } from "./types"

const ROUTE_RUNS: SlotRuns = "route"
const IN_PLACE_RUNS: SlotRuns = "in-place"
const DECORATOR_SITE: PatternMatch["site"] = "decorator"
const PART_BY_RUNS: ReadonlyMap<SlotRuns, CardPart> = new Map<SlotRuns, CardPart>([
  ["route", "handler"],
  ["middleware", "middleware"],
])
const SLOT_HOLDER_TYPES: ReadonlySet<ReadBlock["type"]> = new Set<ReadBlock["type"]>(["property", "effect-callback", "code-event"])
const PATH_SEPARATOR = "/"
const ANY_METHOD = "ANY"
const METHOD_HEADINGS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "GET", "DELETE", "HEAD", "OPTIONS"])

export const joinPaths = (prefix: string | null, path: string | null): string | null => {
  if (prefix === null) return path
  const parts = [prefix, path ?? ""].flatMap((part) => part.split(PATH_SEPARATOR)).filter((part) => part !== "")
  return `${PATH_SEPARATOR}${parts.join(PATH_SEPARATOR)}`
}

const HEADING_SEPARATOR = " · "

export const methodHeadingOf = (method: string | null): string => {
  const written = (method ?? "").split(METHOD_SEPARATOR).map((one) => one.trim().toUpperCase())
  return written.every((one) => METHOD_HEADINGS.has(one)) ? [...new Set(written)].join(HEADING_SEPARATOR) : ANY_METHOD
}

const isRegistration = (match: PatternMatch): boolean =>
  match.site === DECORATOR_SITE ? match.runs === ROUTE_RUNS : match.slots.some((slot) => slot.runs === ROUTE_RUNS)

const MOUNT: CardPart = "mount"

const isMount = (match: PatternMatch): boolean => match.isMounting && !isRegistration(match)

const routeCardOf = (match: PatternMatch, part: CardPart, groupKey: string | null, ownerId: string | null = null): BlockCard => ({
  library: match.library,
  kind: "route",
  part,
  heading: isRegistration(match) ? methodHeadingOf(match.method) : null,
  groupKey,
  ownerId,
})

export type NameOfWritten = (node: SyntaxNode) => string | null

interface RouteReading {
  readonly blocks: readonly ReadBlock[]
  readonly nodeAt: (range: SourceRange) => SyntaxNode
  readonly nameOfWritten: NameOfWritten
}

const seedOf = (block: ReadBlock | null, card: BlockCard): CardSeed[] => (block === null ? [] : [{ blockId: block.id, card }])

const namedSeedOf = (block: ReadBlock | null, card: BlockCard, name: string | null): CardSeed[] =>
  block === null ? [] : [{ blockId: block.id, card, ...(name === null ? {} : { name }) }]

const isHoldingSlot = (block: ReadBlock): boolean => SLOT_HOLDER_TYPES.has(block.type)

const isRunInPlace = (block: ReadBlock): boolean => block.catalogue?.runs === IN_PLACE_RUNS

const handedInPlaceBy = (block: ReadBlock, blocks: readonly ReadBlock[]): ReadBlock => childrenOf(blocks, block).find(isRunInPlace) ?? block

const readSlotSeeds = (match: PatternMatch, slot: MatchedSlot, reading: RouteReading, groupKey: string | null, ownerId: string | null = null): CardSeed[] => {
  const part = PART_BY_RUNS.get(slot.runs)
  if (part === undefined) return []
  const card = routeCardOf(match, part, groupKey, ownerId)
  const written = outermostAt(reading.blocks, slot.range)
  if (written === null) return seedOf(innermostAround(reading.blocks, slot.range, isHoldingSlot), card)
  const named = handedInPlaceBy(written, reading.blocks)
  return named === written ? namedSeedOf(written, card, reading.nameOfWritten(reading.nodeAt(slot.range))) : seedOf(named, card)
}

const readRegistrationSeeds = (match: PatternMatch, reading: RouteReading): CardSeed[] => {
  const { blocks } = reading
  const groupKey = joinPaths(match.prefix, match.path)
  if (groupKey === null) return []
  if (match.site === DECORATOR_SITE) {
    const handler = innermostCallableAround(blocks, match.range)
    return [
      ...seedOf(handler, routeCardOf(match, "handler", groupKey)),
      ...(handler === null ? [] : match.slots.flatMap((slot) => readSlotSeeds(match, slot, reading, groupKey, handler.id))),
    ]
  }
  return [
    ...seedOf(innermostAt(blocks, match.range), routeCardOf(match, "holder", groupKey)),
    ...match.slots.flatMap((slot) => readSlotSeeds(match, slot, reading, groupKey)),
  ]
}

const isAnyBlock = (): boolean => true

const readMountSeeds = (match: PatternMatch, reading: RouteReading): CardSeed[] => {
  const { blocks } = reading
  const mount = innermostAt(blocks, match.range) ?? innermostAround(blocks, match.range, isAnyBlock)
  return [
    ...seedOf(mount, routeCardOf(match, MOUNT, match.prefix)),
    ...match.slots.flatMap((slot) => readSlotSeeds(match, slot, reading, match.prefix)),
  ]
}

const MIDDLEWARE_RUNS: SlotRuns = "middleware"

const isRouterWideMiddleware = (match: PatternMatch): boolean =>
  !isRegistration(match) && !isMount(match) && (match.site === DECORATOR_SITE ? match.runs === MIDDLEWARE_RUNS : match.slots.some((slot) => slot.runs === MIDDLEWARE_RUNS))

const readRouterWideSeeds = (match: PatternMatch, reading: RouteReading): CardSeed[] =>
  match.site === DECORATOR_SITE
    ? seedOf(innermostCallableAround(reading.blocks, match.range), routeCardOf(match, "middleware", null))
    : match.slots.flatMap((slot) => readSlotSeeds(match, slot, reading, null))

const nameNothing: NameOfWritten = () => null

export const readRouteCards = ({ matches, blocks, nodeAt }: CardReading, nameOfWritten: NameOfWritten = nameNothing): CardSeed[] => {
  const reading = { blocks, nodeAt, nameOfWritten }
  return [
    ...matches.filter(isRegistration).flatMap((match) => readRegistrationSeeds(match, reading)),
    ...matches.filter(isMount).flatMap((match) => readMountSeeds(match, reading)),
    ...matches.filter(isRouterWideMiddleware).flatMap((match) => readRouterWideSeeds(match, reading)),
  ]
}
