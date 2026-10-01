import { z } from "zod"

export const AUTHOR_ROLES = ["self", "tracked"] as const

export const searchRepositoryAuthorsInputSchema = z.strictObject({
  repositoryName: z.string(),
  role: z.enum(AUTHOR_ROLES),
  query: z.string(),
})

export const authorSuggestionsSchema = z.strictObject({
  options: z.array(
    z.strictObject({
      id: z.string(),
      name: z.string(),
      detail: z.string(),
      avatarUrl: z.string().nullable(),
      monogram: z.string(),
      isTaken: z.boolean(),
      stateLabel: z.string().nullable(),
    }),
  ),
  message: z.string().nullable(),
})

export type SearchRepositoryAuthorsInput = z.infer<typeof searchRepositoryAuthorsInputSchema>
export type AuthorRole = (typeof AUTHOR_ROLES)[number]
export type AuthorSuggestions = z.infer<typeof authorSuggestionsSchema>
