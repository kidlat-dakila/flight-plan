import { fuzzyScoreOf } from "./fuzzy-score"
import type { FileSuggestions } from "./schemas"

export interface FileSelection {
  readonly changedPaths: readonly string[]
  readonly unchangedPaths: readonly string[]
  readonly query: string
  readonly limit: number
}

interface ScoredPath {
  readonly path: string
  readonly score: number
}

const CHANGED_LABEL = "Changed"
const NO_MATCH_MESSAGE = "No file matches."
const NO_CHANGED_FILES_MESSAGE = "This Flight Plan has no changed files."

const scorePath = (query: string, path: string): ScoredPath[] => {
  const score = fuzzyScoreOf(query, path)
  return score === null ? [] : [{ path, score }]
}

export const rankPaths = (paths: readonly string[], query: string): string[] =>
  [...paths.flatMap((path) => scorePath(query, path))]
    .sort((one, two) => two.score - one.score || one.path.localeCompare(two.path))
    .map((scored) => scored.path)

export const selectFiles = ({ changedPaths, unchangedPaths, query, limit }: FileSelection): FileSuggestions => {
  const isBrowsing = query.trim() === ""
  const changed = isBrowsing ? changedPaths : rankPaths(changedPaths, query)
  const unchanged = isBrowsing ? [] : rankPaths(unchangedPaths, query)
  const options = [
    ...changed.map((path) => ({ path, stateLabel: CHANGED_LABEL })),
    ...unchanged.map((path) => ({ path, stateLabel: null })),
  ]
  const emptyMessage = isBrowsing ? NO_CHANGED_FILES_MESSAGE : NO_MATCH_MESSAGE
  return {
    options: isBrowsing ? options : options.slice(0, limit),
    message: options.length === 0 ? emptyMessage : null,
  }
}
