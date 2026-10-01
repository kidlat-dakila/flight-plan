import { z } from "zod"

export const searchRepositoryFoldersInputSchema = z.strictObject({ query: z.string() })

export const folderSuggestionsSchema = z.strictObject({
  options: z.array(
    z.strictObject({ path: z.string(), name: z.string(), isAdded: z.boolean(), stateLabel: z.string().nullable() }),
  ),
  message: z.string().nullable(),
})

export type SearchRepositoryFoldersInput = z.infer<typeof searchRepositoryFoldersInputSchema>
export type FolderSuggestions = z.infer<typeof folderSuggestionsSchema>
