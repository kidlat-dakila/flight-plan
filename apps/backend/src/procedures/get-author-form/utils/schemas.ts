import { z } from "zod"

export const getAuthorFormInputSchema = z.strictObject({ path: z.string() })

export const authorFormSchema = z.strictObject({
  selfAuthorHint: z.string().nullable(),
  searchHint: z.string(),
  searchPlaceholder: z.string(),
})

export type AuthorForm = z.infer<typeof authorFormSchema>
export type GetAuthorFormInput = z.infer<typeof getAuthorFormInputSchema>
