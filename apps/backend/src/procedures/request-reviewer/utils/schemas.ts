import { z } from "zod"
import { reviewKeyShape } from "@/procedures/get-review/utils/schemas-review-action"

export const reviewerLoginInputSchema = z.strictObject({ ...reviewKeyShape, login: z.string().trim().min(1) })

export type ReviewerLoginInput = z.infer<typeof reviewerLoginInputSchema>
