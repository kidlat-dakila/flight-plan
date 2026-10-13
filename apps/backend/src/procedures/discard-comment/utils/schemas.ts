import { z } from "zod"
import { reviewKeyShape } from "@/procedures/get-review/utils/schemas-review-action"

export const discardCommentInputSchema = z.strictObject({ ...reviewKeyShape, commentId: z.string() })

export type DiscardCommentInput = z.infer<typeof discardCommentInputSchema>
