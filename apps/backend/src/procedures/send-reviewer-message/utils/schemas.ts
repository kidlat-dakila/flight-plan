import { z } from "zod"

const MAX_MESSAGE_LENGTH = 10_000

export const sendReviewerMessageInputSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  reference: z.string().nullable(),
})

export const reviewerMessageSendingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("sent"), messageId: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type SendReviewerMessageInput = z.infer<typeof sendReviewerMessageInputSchema>
export type ReviewerMessageSending = z.infer<typeof reviewerMessageSendingSchema>
