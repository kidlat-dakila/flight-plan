import { addedLabelOf, type AddedPaths } from "@/procedures/get-setup/utils/added-paths"
import type { FolderSuggestions } from "./schemas"

const MAX_SUGGESTIONS = 8
const LAST_SEGMENT_PATTERN = /[^\\/]+$/
const NO_REPOSITORIES_MESSAGE = "No repository folders were found on this machine."

const folderNameOf = (path: string): string => LAST_SEGMENT_PATTERN.exec(path)?.[0] ?? path

const noMatchMessage = (query: string): string =>
  query.trim() === "" ? NO_REPOSITORIES_MESSAGE : `No repository folder matches “${query.trim()}”.`

const toOption = (path: string, addedPaths: AddedPaths): FolderSuggestions["options"][number] => {
  const stateLabel = addedLabelOf(path, addedPaths)
  return { path, name: folderNameOf(path), isAdded: stateLabel !== null, stateLabel }
}

export const buildFolderSuggestions = (
  paths: readonly string[],
  addedPaths: AddedPaths,
  query: string,
): FolderSuggestions => ({
  options: paths.slice(0, MAX_SUGGESTIONS).map((path) => toOption(path, addedPaths)),
  message: paths.length === 0 ? noMatchMessage(query) : null,
})
