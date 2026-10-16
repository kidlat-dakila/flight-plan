import type { SyntaxNode } from "@/ast-graph/parser"
import type { MatchedSlot, PatternMatch } from "@/catalogue/matching/match-sites"
import { kindOfPatternKey } from "@/catalogue/pattern-keys"
import type { BlockMade, ClassMember } from "@/catalogue/types"
import { rangeOfNode } from "@/code-blocks/source-range"
import type { CatalogueRuns, CodeBlockCatalogue, CodeBlockType, SourceRange } from "@/code-blocks/types"
import { groupBy } from "@/shared/group-by"

export type DeclaredType = Extract<BlockMade, "state" | "derived">

export interface NamedBlock {
  readonly type: CodeBlockType | null
  readonly declares: DeclaredType | null
  readonly catalogue: CodeBlockCatalogue
  readonly prefix: string | null
  readonly members: readonly ClassMember[]
  readonly isProviding: boolean
}

export interface FileNaming {
  readonly blockAt: (node: SyntaxNode) => NamedBlock | null
  readonly slotAt: (value: SyntaxNode) => CodeBlockCatalogue | null
}

const DECLARED_TYPES: ReadonlySet<BlockMade> = new Set<BlockMade>(["state", "derived"])
const ENTRY_RUNS: readonly CatalogueRuns[] = ["route", "resolver", "middleware"]
const ENTRY_TYPES: ReadonlySet<CatalogueRuns> = new Set(ENTRY_RUNS)
const CALL_SITE: PatternMatch["site"] = "call"
const MEMBER_WILDCARD = "*"
const PATH_SEPARATOR = "/"

const keyOf = ({ start, end }: SourceRange): string => [start.line, start.column, end.line, end.column].join(":")

const FACTORY_KIND = "factory"

const isMadeByFactory = (match: PatternMatch): boolean => kindOfPatternKey(match.patternKey) === FACTORY_KIND

const entryRunsOf = (match: PatternMatch): CatalogueRuns | null =>
  isMadeByFactory(match) ? null : (ENTRY_RUNS.find((runs) => match.slots.some((slot) => slot.runs === runs)) ?? null)

const runsOf = (match: PatternMatch): CatalogueRuns | null =>
  match.site === CALL_SITE ? (entryRunsOf(match) ?? match.runs) : (match.runs ?? entryRunsOf(match))

const isEntryType = (runs: CatalogueRuns | null): runs is "route" | "resolver" | "middleware" => runs !== null && ENTRY_TYPES.has(runs)

const typeOf = (match: PatternMatch): CodeBlockType | null => {
  if (match.site !== CALL_SITE) return null
  if (match.makes !== null && !DECLARED_TYPES.has(match.makes)) return match.makes
  const runs = entryRunsOf(match)
  return isEntryType(runs) ? runs : null
}

const isDeclaredType = (made: BlockMade | null): made is DeclaredType => made !== null && DECLARED_TYPES.has(made)

const declaredBy = (match: PatternMatch): DeclaredType | null => (match.site === CALL_SITE && isDeclaredType(match.makes) ? match.makes : null)

const catalogueOf = (match: PatternMatch, runs: CatalogueRuns | null): CodeBlockCatalogue => ({
  specifier: match.specifier,
  name: match.name,
  runs,
  path: pathBelow(match.prefix, match.path),
  method: match.method,
  event: match.event,
  certainty: match.versions === null ? "proven" : "assumed",
})

const withOwnNode = (catalogue: CodeBlockCatalogue, match: PatternMatch): CodeBlockCatalogue => (match.isOwnNode ? { ...catalogue, isOwnNode: true } : catalogue)

const slotCatalogueOf = (match: PatternMatch, slot: MatchedSlot): CodeBlockCatalogue => ({
  ...catalogueOf(match, slot.runs),
  path: slot.path,
  method: null,
  event: null,
})

const namedBy = (match: PatternMatch): NamedBlock => ({
  type: typeOf(match),
  declares: declaredBy(match),
  catalogue: withOwnNode(catalogueOf(match, runsOf(match)), match),
  prefix: match.prefix,
  members: match.members,
  isProviding: match.isProviding,
})

const mostTelling = (named: readonly NamedBlock[]): NamedBlock | null => {
  const telling = named.find((candidate) => candidate.type !== null) ?? named.find((candidate) => candidate.declares !== null) ?? (named.length === 0 ? null : named[0])
  return telling === null ? null : { ...telling, isProviding: named.some((candidate) => candidate.isProviding) }
}

export const createFileNaming = (matches: readonly PatternMatch[]): FileNaming => {
  const namedByRange = groupBy(matches, (match) => keyOf(match.range))
  const slotByRange = new Map(
    matches.flatMap((match) => match.slots.map((slot) => [keyOf(slot.range), slotCatalogueOf(match, slot)] as const)),
  )
  return {
    blockAt: (node) => mostTelling((namedByRange.get(keyOf(rangeOfNode(node))) ?? []).map(namedBy)),
    slotAt: (value) => slotByRange.get(keyOf(rangeOfNode(value))) ?? null,
  }
}

export const NO_NAMING: FileNaming = { blockAt: () => null, slotAt: () => null }

export const memberNamed = (named: NamedBlock, name: string): ClassMember | null =>
  named.members.find((member) => (member.name.endsWith(MEMBER_WILDCARD) ? name.startsWith(member.name.slice(0, -MEMBER_WILDCARD.length)) : member.name === name)) ?? null

export const pathBelow = (prefix: string | null, path: string | null): string | null => {
  if (prefix === null || path === null) return path ?? prefix
  const parts = [prefix, path].flatMap((part) => part.split(PATH_SEPARATOR)).filter((part) => part !== "")
  return `${PATH_SEPARATOR}${parts.join(PATH_SEPARATOR)}`
}
