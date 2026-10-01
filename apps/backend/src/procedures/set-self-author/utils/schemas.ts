import { z } from "zod"

export const setSelfAuthorInputSchema = z.strictObject({
  repositoryName: z.string(),
  authorId: z.string().nullable(),
})

export const selfAuthorSchema = z.strictObject({ authorId: z.string().nullable() })

export type SetSelfAuthorInput = z.infer<typeof setSelfAuthorInputSchema>
