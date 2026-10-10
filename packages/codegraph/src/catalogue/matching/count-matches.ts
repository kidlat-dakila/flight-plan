import type { PatternMatches } from "@/catalogue/proposed-patterns"
import type { CatalogueLibrary } from "@/catalogue/types"
import { groupBy } from "@/shared/group-by"
import { languageOfFile, matchSource } from "./match-source"

export interface RepositoryFile {
  readonly filePath: string
  readonly text: string
}

const KEY_SEPARATOR = "\n"

const matchesIn = ({ filePath, text }: RepositoryFile, libraries: readonly CatalogueLibrary[]): PatternMatches[] => {
  const language = languageOfFile(filePath)
  if (language === null) return []
  return matchSource({ filePath, language, text }, libraries).map(({ library, patternKey }) => ({ library, patternKey, matchCount: 1 }))
}

export const countPatternMatches = (files: readonly RepositoryFile[], libraries: readonly CatalogueLibrary[]): PatternMatches[] => {
  const found = files.flatMap((file) => matchesIn(file, libraries))
  return [...groupBy(found, (match) => [match.library, match.patternKey].join(KEY_SEPARATOR)).values()].map((same) => ({
    library: same[0].library,
    patternKey: same[0].patternKey,
    matchCount: same.length,
  }))
}
