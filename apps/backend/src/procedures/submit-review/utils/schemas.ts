import { z } from "zod"
import { REVIEW_VERDICTS } from "@/procedures/get-review/utils/schemas"
import { reviewKeyShape } from "@/procedures/get-review/utils/schemas-review-action"

const MAX_SUMMARY_LENGTH = 10_000

export const submitReviewInputSchema = z.strictObject({
  ...reviewKeyShape,
  verdict: z.enum(REVIEW_VERDICTS),
  body: z.string().trim().max(MAX_SUMMARY_LENGTH),
})

export type SubmitReviewInput = z.infer<typeof submitReviewInputSchema>
