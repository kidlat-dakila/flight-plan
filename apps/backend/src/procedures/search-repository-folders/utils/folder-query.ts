import type { FolderSuggestions } from "./schemas"

const MIN_QUERY_LENGTH = 3

export const ASK_FOR_MORE_CHARACTERS: FolderSuggestions = {
  options: [],
  message: `Type at least ${String(MIN_QUERY_LENGTH)} characters to search for a repository folder.`,
}

export const hasEnoughCharacters = (query: string): boolean => query.trim().length >= MIN_QUERY_LENGTH
