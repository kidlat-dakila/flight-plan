import { z } from "zod"
import { DIFF_SIDES } from "@/procedures/get-review/utils/schemas"
import { reviewKeyShape } from "@/procedures/get-review/utils/schemas-review-action"

const MAX_COMMENT_LENGTH = 10_000

export const commentBodySchema = z.string().trim().min(1).max(MAX_COMMENT_LENGTH)

export const commentPositionSchema = z.strictObject({
  path: z.string(),
  side: z.enum(DIFF_SIDES),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
})

export const addCommentInputSchema = z.strictObject({
  ...reviewKeyShape,
  position: commentPositionSchema.nullable(),
  body: commentBodySchema,
  shouldPostNow: z.boolean(),
})

export type AddCommentInput = z.infer<typeof addCommentInputSchema>
