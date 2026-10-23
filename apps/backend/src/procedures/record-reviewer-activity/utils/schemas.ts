import { z } from "zod"

export const recordReviewerActivityInputSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
})

export const reviewerActivityRecordingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("recorded") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type RecordReviewerActivityInput = z.infer<typeof recordReviewerActivityInputSchema>
export type ReviewerActivityRecording = z.infer<typeof reviewerActivityRecordingSchema>
