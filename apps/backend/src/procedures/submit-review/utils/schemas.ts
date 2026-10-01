import { z } from "zod"
import { REVIEW_VERDICTS } from "@/procedures/get-review/utils/schemas"

const MAX_SUMMARY_LENGTH = 10_000

export const submitReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  verdict: z.enum(REVIEW_VERDICTS),
  body: z.string().trim().max(MAX_SUMMARY_LENGTH),
})

export const submittedReviewSchema = z.strictObject({ message: z.string() })

export type SubmitReviewInput = z.infer<typeof submitReviewInputSchema>
