import { z } from "zod"
import { commentBodySchema } from "@/procedures/add-comment/utils/schemas"
import { reviewKeyShape } from "@/procedures/get-review/utils/schemas-review-action"

export const replyToThreadInputSchema = z.strictObject({ ...reviewKeyShape, threadId: z.string(), body: commentBodySchema })

export type ReplyToThreadInput = z.infer<typeof replyToThreadInputSchema>
