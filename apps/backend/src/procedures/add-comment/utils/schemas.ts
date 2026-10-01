import { z } from "zod"

const MAX_COMMENT_LENGTH = 10_000

export const addCommentInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  threadId: z.string().nullable(),
  location: z.strictObject({ path: z.string(), line: z.number().int().positive() }).nullable(),
  body: z.string().trim().min(1).max(MAX_COMMENT_LENGTH),
})

export const addedCommentSchema = z.strictObject({ threadId: z.string() })

export type AddCommentInput = z.infer<typeof addCommentInputSchema>
