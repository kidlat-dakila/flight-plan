import { z } from "zod"
import { reviewedSubjectSchema } from "@flightplan/reviewed-marks"

export const setReviewedInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  subject: reviewedSubjectSchema,
  isReviewed: z.boolean(),
})

export const reviewedChangeSchema = z.strictObject({ isReviewed: z.boolean() })

export type SetReviewedInput = z.infer<typeof setReviewedInputSchema>
