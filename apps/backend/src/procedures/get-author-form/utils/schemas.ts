import { z } from "zod"
import { trackedAuthorSchema } from "@/procedures/get-setup/utils/schemas"

export const getAuthorFormInputSchema = z.strictObject({ path: z.string() })

export const gitSelfAuthorSchema = z.strictObject({
  author: trackedAuthorSchema,
})

export const authorFormSchema = z.strictObject({
  gitSelfAuthor: gitSelfAuthorSchema.nullable(),
  searchHint: z.string(),
  searchPlaceholder: z.string(),
})

export type AuthorForm = z.infer<typeof authorFormSchema>
export type GetAuthorFormInput = z.infer<typeof getAuthorFormInputSchema>
