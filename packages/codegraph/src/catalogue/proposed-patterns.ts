import { listPatternKeys } from "./pattern-keys"
import type { CatalogueLibrary } from "./types"

export interface PatternMatches {
  readonly library: string
  readonly patternKey: string
  readonly matchCount: number
}

export interface ProposalCheck {
  readonly kept: readonly PatternMatches[]
  readonly refused: readonly string[]
}

const NO_MATCH = 0
const MATCH_SEPARATOR = "\n"

const matchIdOf = (library: string, patternKey: string): string => `${library}${MATCH_SEPARATOR}${patternKey}`

const countByMatchId = (matches: readonly PatternMatches[]): ReadonlyMap<string, number> =>
  new Map(matches.map((match) => [matchIdOf(match.library, match.patternKey), match.matchCount]))

const proposedMatchesOf = (library: CatalogueLibrary, counts: ReadonlyMap<string, number>): PatternMatches[] =>
  listPatternKeys(library).map((patternKey) => ({
    library: library.name,
    patternKey,
    matchCount: counts.get(matchIdOf(library.name, patternKey)) ?? NO_MATCH,
  }))

export const checkProposedLibraries = (proposed: readonly CatalogueLibrary[], matches: readonly PatternMatches[]): ProposalCheck => {
  const counts = countByMatchId(matches)
  const proposedMatches = proposed.flatMap((library) => proposedMatchesOf(library, counts))
  return {
    kept: proposedMatches.filter((match) => match.matchCount > NO_MATCH),
    refused: proposedMatches
      .filter((match) => match.matchCount === NO_MATCH)
      .map((match) => `${match.library}: ${match.patternKey} matches nothing in the repository`),
  }
}
