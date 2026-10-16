import type { SyntaxNode } from "@/ast-graph/parser"
import type { MatchedSlot, PatternMatch } from "@/catalogue/matching/match-sites"
import type { SlotRuns } from "@/catalogue/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { BlockCard, CardPart, SourceRange } from "@/code-blocks/types"
import { innermostAt, innermostCallableAround, outermostAt } from "./read-blocks"
import type { CardReading, CardSeed } from "./types"

const ROUTE_RUNS: SlotRuns = "route"
const DECORATOR_SITE: PatternMatch["site"] = "decorator"
const PART_BY_RUNS: ReadonlyMap<SlotRuns, CardPart> = new Map<SlotRuns, CardPart>([
  ["route", "handler"],
  ["middleware", "middleware"],
])
const PATH_SEPARATOR = "/"
const ANY_METHOD = "ANY"
const METHOD_HEADINGS: ReadonlySet<string> = new Set(["POST", "PUT", "PATCH", "GET", "DELETE", "HEAD", "OPTIONS"])

export const joinPaths = (prefix: string | null, path: string | null): string | null => {
  if (prefix === null) return path
  const parts = [prefix, path ?? ""].flatMap((part) => part.split(PATH_SEPARATOR)).filter((part) => part !== "")
  return `${PATH_SEPARATOR}${parts.join(PATH_SEPARATOR)}`
}

export const methodHeadingOf = (method: string | null): string => {
  const heading = method?.toUpperCase() ?? ANY_METHOD
  return METHOD_HEADINGS.has(heading) ? heading : ANY_METHOD
}

const isRegistration = (match: PatternMatch): boolean =>
  match.site === DECORATOR_SITE ? match.runs === ROUTE_RUNS : match.slots.some((slot) => slot.runs === ROUTE_RUNS)

const routeCardOf = (match: PatternMatch, part: CardPart, groupKey: string): BlockCard => ({
  library: match.library,
  kind: "route",
  part,
  heading: methodHeadingOf(match.method),
  groupKey,
  ownerId: null,
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

const readSlotSeeds = (match: PatternMatch, slot: MatchedSlot, reading: RouteReading, groupKey: string): CardSeed[] => {
  const part = PART_BY_RUNS.get(slot.runs)
  return part === undefined ? [] : namedSeedOf(outermostAt(reading.blocks, slot.range), routeCardOf(match, part, groupKey), reading.nameOfWritten(reading.nodeAt(slot.range)))
}

const readRegistrationSeeds = (match: PatternMatch, reading: RouteReading): CardSeed[] => {
  const { blocks } = reading
  const groupKey = joinPaths(match.prefix, match.path)
  if (groupKey === null) return []
  if (match.site === DECORATOR_SITE) return seedOf(innermostCallableAround(blocks, match.range), routeCardOf(match, "handler", groupKey))
  return [
    ...seedOf(innermostAt(blocks, match.range), routeCardOf(match, "holder", groupKey)),
    ...match.slots.flatMap((slot) => readSlotSeeds(match, slot, reading, groupKey)),
  ]
}

const nameNothing: NameOfWritten = () => null

export const readRouteCards = ({ matches, blocks, nodeAt }: CardReading, nameOfWritten: NameOfWritten = nameNothing): CardSeed[] =>
  matches.filter(isRegistration).flatMap((match) => readRegistrationSeeds(match, { blocks, nodeAt, nameOfWritten }))
