import { z } from "zod"

export const FILE_SEARCH_SCOPES = ["repository", "flight-plan", "changed"] as const

export const searchFilesInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  query: z.string(),
  scope: z.enum(FILE_SEARCH_SCOPES),
})

export const fileOptionSchema = z.strictObject({
  path: z.string(),
  stateLabel: z.string().nullable(),
})

export const fileSuggestionsSchema = z.strictObject({
  options: z.array(fileOptionSchema),
  message: z.string().nullable(),
})

export type FileSearchScope = (typeof FILE_SEARCH_SCOPES)[number]
export type SearchFilesInput = z.infer<typeof searchFilesInputSchema>
export type FileOption = z.infer<typeof fileOptionSchema>
export type FileSuggestions = z.infer<typeof fileSuggestionsSchema>
