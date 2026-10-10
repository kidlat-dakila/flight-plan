import type { ChainFacts } from "./chain-facts"
import { codeSiteIdOf, type CodeSite, type EdgeFact, type JourneyFact } from "./facts"

export interface JourneyScope {
  readonly filePaths: readonly string[]
  readonly sharedFilePaths: readonly string[]
}

type Ids = ReadonlySet<string>

const isEdge = (fact: JourneyFact): fact is EdgeFact => fact.kind === "edge"

const idsIn = (sites: readonly CodeSite[], filePaths: readonly string[]): Ids =>
  new Set(sites.filter((site) => filePaths.includes(site.file.filePath)).map(codeSiteIdOf))

const grow = (reached: Ids, edges: readonly EdgeFact[], nextOf: (edge: EdgeFact, reached: Ids) => string | null): Ids => {
  const added = edges.flatMap((edge) => {
    const next = nextOf(edge, reached)
    return next === null || reached.has(next) ? [] : [next]
  })
  return added.length === 0 ? reached : grow(new Set([...reached, ...added]), edges, nextOf)
}

const leadingTo = (targetIds: Ids, edges: readonly EdgeFact[]): Ids =>
  grow(targetIds, edges, (edge, reached) => (reached.has(codeSiteIdOf(edge.to)) ? codeSiteIdOf(edge.from) : null))

export const scopeChainFacts = ({ facts, changedSites }: ChainFacts, { filePaths, sharedFilePaths }: JourneyScope): ChainFacts => {
  const edges = facts.filter(isEdge)
  const targetIds = idsIn(changedSites, filePaths)
  const leadingIds = leadingTo(targetIds, edges)
  const towardSharedIds = leadingTo(idsIn(changedSites, sharedFilePaths), edges)
  const belowIds = grow(targetIds, edges, (edge, reached) =>
    reached.has(codeSiteIdOf(edge.from)) && towardSharedIds.has(codeSiteIdOf(edge.to)) ? codeSiteIdOf(edge.to) : null)
  const isKept = (fact: JourneyFact): boolean => {
    if (!isEdge(fact)) return leadingIds.has(codeSiteIdOf(fact.site))
    return leadingIds.has(codeSiteIdOf(fact.to)) || (belowIds.has(codeSiteIdOf(fact.from)) && belowIds.has(codeSiteIdOf(fact.to)))
  }
  const drawnIds = new Set([...leadingIds, ...belowIds])
  return { facts: facts.filter(isKept), changedSites: changedSites.filter((site) => drawnIds.has(codeSiteIdOf(site))) }
}
