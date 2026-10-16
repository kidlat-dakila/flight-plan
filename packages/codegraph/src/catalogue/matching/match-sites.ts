import { isSameNode } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"
import { patternKeyOf } from "@/catalogue/pattern-keys"
import type { BlockMade, CatalogueLibrary, ClassMember, ContextProvision, Slot, SlotPosition, SlotRuns } from "@/catalogue/types"
import { rangeOfNode } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"
import { calledKeyOf, joinPrefixes, keyBelow, listExportedPatterns, listMethods, originOf, type MadeValue, type Origin, type OriginContext } from "./origins"
import { isRestOfArguments, lastKeyOf, listPositional, nodesAt, placedAt, type PlaceHolder, type PlacedNode } from "./places"
import type { PassedValue, Site, SyntaxReader } from "./syntax-reader"

export interface MatchedSlot {
  readonly runs: SlotRuns
  readonly range: SourceRange
  readonly path: string | null
  readonly holdsActions: boolean
}

export interface PatternMatch {
  readonly library: string
  readonly specifier: string | null
  readonly patternKey: string
  readonly name: string
  readonly site: Site["kind"] | "file" | "directive"
  readonly range: SourceRange
  readonly makes: BlockMade | null
  readonly runs: SlotRuns | null
  readonly slots: readonly MatchedSlot[]
  readonly path: string | null
  readonly prefix: string | null
  readonly method: string | null
  readonly event: string | null
  readonly versions: string | null
  readonly unfilledPlaces: readonly string[]
  readonly members: readonly ClassMember[]
  readonly isProviding: boolean
  readonly isOwnNode: boolean
}

interface PatternSaying {
  readonly name: string
  readonly versions?: string
  readonly slots?: readonly Slot[]
  readonly runs?: SlotRuns
  readonly makes?: BlockMade
  readonly pathAt?: SlotPosition
  readonly prefixAt?: SlotPosition
  readonly method?: string
  readonly methodAt?: SlotPosition
  readonly eventAt?: SlotPosition
  readonly members?: readonly ClassMember[]
  readonly provides?: ContextProvision
  readonly isOwnNode?: boolean
}

interface MatchSource {
  readonly library: CatalogueLibrary
  readonly specifier: string
  readonly patternKey: string
}

type MatchedKind = "call" | "factory" | "decorator" | "element"

const KINDS_BY_SITE: Readonly<Record<Exclude<Site["kind"], "class">, ReadonlySet<MatchedKind>>> = {
  call: new Set<MatchedKind>(["call", "factory"]),
  decorator: new Set<MatchedKind>(["decorator"]),
  element: new Set<MatchedKind>(["element"]),
}
const CALLED_NAME = "called"

const textAt = (position: SlotPosition | undefined, passed: readonly PassedValue[], reader: SyntaxReader): string | null =>
  position === undefined
    ? null
    : (nodesAt(position, passed, reader)
        .map((node) => reader.textOf(node))
        .find((text) => text !== null) ?? null)

const isAmong = (node: SyntaxNode, nodes: readonly SyntaxNode[]): boolean => nodes.some((other) => isSameNode(other, node))

const restOf = (saying: PatternSaying, passed: readonly PassedValue[], reader: SyntaxReader): SyntaxNode[] => {
  const slotted = (saying.slots ?? []).map((slot) => slot.at).filter((position) => !isRestOfArguments(position))
  const written = [saying.pathAt, saying.prefixAt].filter((position) => position !== undefined)
  const taken = [
    ...slotted.flatMap((position) => nodesAt(position, passed, reader)),
    ...written.flatMap((position) => nodesAt(position, passed, reader)).filter((node) => !reader.isFunction(node)),
  ]
  return listPositional(passed).filter((argument) => !isAmong(argument, taken))
}

const KEY_OF_PROPERTY = "@key"
const PATH_SEPARATOR = "/"

const pathPartOf = (holder: PlaceHolder, pathKey: string, reader: SyntaxReader): string | null => {
  if (holder.kind === "property") return pathKey === KEY_OF_PROPERTY ? holder.name : null
  const written = (reader.propertiesOf(holder.node) ?? []).find((property) => property.name === pathKey)
  return written === undefined ? null : reader.textOf(written.node)
}

const pathBelow = (path: string, part: string): string => {
  if (part.startsWith(PATH_SEPARATOR) || path === "") return part
  return part === "" ? path : `${path.endsWith(PATH_SEPARATOR) ? path.slice(0, -PATH_SEPARATOR.length) : path}${PATH_SEPARATOR}${part}`
}

const pathOfPlaced = ({ holders }: PlacedNode, saying: PatternSaying, reader: SyntaxReader): string | null => {
  const pathKey = saying.pathAt === undefined ? null : lastKeyOf(saying.pathAt)
  if (pathKey === null) return null
  const parts = holders.map((holder) => pathPartOf(holder, pathKey, reader)).filter((part) => part !== null)
  return parts.length === 0 ? null : parts.reduce(pathBelow)
}

const unheld = (node: SyntaxNode): PlacedNode => ({ node, holders: [] })

const slotsOf = (saying: PatternSaying, passed: readonly PassedValue[], reader: SyntaxReader): MatchedSlot[] =>
  (saying.slots ?? []).flatMap((slot) =>
    (isRestOfArguments(slot.at) ? restOf(saying, passed, reader).map(unheld) : placedAt(slot.at, passed, reader)).map((placed) => ({
      runs: slot.runs,
      range: rangeOfNode(placed.node),
      path: pathOfPlaced(placed, saying, reader),
      holdsActions: slot.holdsActions ?? false,
    })),
  )

const NAMED_PLACES: readonly (keyof Pick<PatternSaying, "pathAt" | "prefixAt" | "methodAt" | "eventAt">)[] = ["pathAt", "prefixAt", "methodAt", "eventAt"]
const SLOT_PLACE = "slot at"

const shownPlace = (role: string, position: SlotPosition): string => `${role} ${JSON.stringify(position)}`

const unfilledPlacesOf = (saying: PatternSaying, passed: readonly PassedValue[], reader: SyntaxReader): string[] => {
  const slots = (saying.slots ?? []).map((slot) => ({ role: SLOT_PLACE, position: slot.at }))
  const named = NAMED_PLACES.flatMap((role) => {
    const position = saying[role]
    return position === undefined ? [] : [{ role, position }]
  })
  return [...slots, ...named]
    .filter(({ position }) => !isRestOfArguments(position) && nodesAt(position, passed, reader).length === 0)
    .map(({ role, position }) => shownPlace(role, position))
}

const matchOfPassed = (saying: PatternSaying, source: MatchSource, site: Site, passed: readonly PassedValue[], reader: SyntaxReader): PatternMatch => ({
  library: source.library.name,
  specifier: source.specifier,
  patternKey: source.patternKey,
  name: saying.name,
  site: site.kind,
  range: rangeOfNode(site.node),
  makes: saying.makes ?? null,
  runs: saying.runs ?? null,
  slots: slotsOf(saying, passed, reader),
  path: textAt(saying.pathAt, passed, reader),
  prefix: textAt(saying.prefixAt, passed, reader),
  method: saying.method ?? textAt(saying.methodAt, passed, reader)?.toUpperCase() ?? null,
  event: textAt(saying.eventAt, passed, reader),
  versions: saying.versions ?? null,
  unfilledPlaces: unfilledPlacesOf(saying, passed, reader),
  members: saying.members ?? [],
  isProviding: saying.provides !== undefined,
  isOwnNode: saying.isOwnNode ?? false,
})

const matchOf = (saying: PatternSaying, source: MatchSource, site: Site, reader: SyntaxReader): PatternMatch =>
  matchOfPassed(saying, source, site, reader.passedTo(site.node), reader)

const matchesOfMade = (made: MadeValue, site: Exclude<Site, { kind: "class" }>, reader: SyntaxReader): PatternMatch[] => {
  const source = { library: made.library, specifier: made.specifier }
  if (made.memberPath.length > 0) {
    return listMethods(made, KINDS_BY_SITE[site.kind]).map((method) => {
      const match = matchOf(method, { ...source, patternKey: keyBelow(made.key, patternKeyOf(method)) }, site, reader)
      return { ...match, prefix: joinPrefixes(made.prefix, match.prefix) }
    })
  }
  if (site.kind !== "call" || made.called === null) return []
  return [matchOf({ ...made.called, name: CALLED_NAME }, { ...source, patternKey: calledKeyOf(made) }, site, reader)]
}

const matchesOfOrigin = (origin: Origin, site: Exclude<Site, { kind: "class" }>, context: OriginContext): PatternMatch[] => {
  if (origin.kind === "made") return matchesOfMade(origin, site, context.reader)
  const kinds: ReadonlySet<string> = KINDS_BY_SITE[site.kind]
  return listExportedPatterns(origin, context).flatMap(({ library, specifier, pattern }) =>
    pattern.kind !== "class" && pattern.kind !== "file" && pattern.kind !== "directive" && kinds.has(pattern.kind)
      ? [matchOf(pattern, { library, specifier, patternKey: patternKeyOf(pattern) }, site, context.reader)]
      : [],
  )
}

const matchesOfClass = (site: Extract<Site, { kind: "class" }>, context: OriginContext): PatternMatch[] =>
  site.bases.flatMap((base) => {
    const origin = originOf(base, context)
    if (origin?.kind !== "export") return []
    return listExportedPatterns(origin, context).flatMap(({ library, specifier, pattern }) =>
      pattern.kind === "class" ? [matchOf(pattern, { library, specifier, patternKey: patternKeyOf(pattern) }, site, context.reader)] : [],
    )
  })

const isVersioned = (match: PatternMatch): boolean => match.versions !== null

const isSamePattern = (one: PatternMatch, two: PatternMatch): boolean => one.library === two.library && one.site === two.site && one.name === two.name

const fittest = (matches: readonly PatternMatch[]): PatternMatch[] =>
  matches.filter((match) => {
    const rivals = matches.filter((other) => isSamePattern(other, match) && isVersioned(other))
    const isFitting = rivals.some((rival) => rival.slots.length > 0)
    return !isVersioned(match) || rivals.length === 1 || !isFitting || match.slots.length > 0
  })

const passedAfterFirst = (passed: readonly PassedValue[]): PassedValue[] =>
  passed.slice(1).map((value) => (value.position === null ? value : { ...value, position: value.position - 1 }))

const matchesOfHanded = (site: Extract<Site, { kind: "call" }>, context: OriginContext): PatternMatch[] => {
  const passed = context.reader.passedTo(site.node)
  const [handed] = listPositional(passed)
  const isMethodCall = context.reader.expressionOf(site.callee).kind === "member"
  const origin = isMethodCall && passed.length > 0 && passed[0].position !== null ? originOf(handed, context) : null
  if (origin?.kind !== "export" || context.reader.expressionOf(handed).kind === "call") return []
  return listExportedPatterns(origin, context).flatMap(({ library, specifier, pattern }) =>
    pattern.kind === "call" ? [matchOfPassed(pattern, { library, specifier, patternKey: patternKeyOf(pattern) }, site, passedAfterFirst(passed), context.reader)] : [],
  )
}

const matchesAt = (site: Site, context: OriginContext): PatternMatch[] => {
  if (site.kind === "class") return matchesOfClass(site, context)
  const origin = originOf(site.callee, context)
  const handed = site.kind === "call" ? matchesOfHanded(site, context) : []
  return [...(origin === null ? [] : fittest(matchesOfOrigin(origin, site, context))), ...handed]
}

export const matchSites = (reader: SyntaxReader, libraries: readonly CatalogueLibrary[]): PatternMatch[] =>
  reader.listSites().flatMap((site) => matchesAt(site, { reader, libraries }))
