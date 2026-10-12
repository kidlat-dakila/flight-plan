import { z } from "zod"

export const deleteReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
})

export const deleteReviewResultSchema = z.strictObject({ message: z.string() })

export type DeleteReviewInput = z.infer<typeof deleteReviewInputSchema>
export type DeleteReviewResult = z.infer<typeof deleteReviewResultSchema>
