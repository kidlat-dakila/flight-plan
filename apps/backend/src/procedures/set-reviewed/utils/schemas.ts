import { z } from "zod"

export const reviewedSubjectSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("waypoint"), id: z.string() }),
  z.strictObject({ kind: z.literal("file"), path: z.string() }),
])

export const setReviewedInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  subject: reviewedSubjectSchema,
  isReviewed: z.boolean(),
})

export const reviewedChangeSchema = z.strictObject({ isReviewed: z.boolean() })

export type ReviewedSubject = z.infer<typeof reviewedSubjectSchema>
export type SetReviewedInput = z.infer<typeof setReviewedInputSchema>
