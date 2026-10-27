import { z } from "zod"
import { EXCERPT_KINDS } from "@/procedures/get-conversation/utils/conversation"

const MAX_MESSAGE_LENGTH = 10_000

export const MAX_EXCERPT_LENGTH = 10_000

export const sendReviewerMessageInputSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  reference: z.string().nullable(),
  excerpt: z.strictObject({ kind: z.enum(EXCERPT_KINDS), text: z.string().max(MAX_EXCERPT_LENGTH) }).nullable(),
})

export const reviewerMessageSendingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("sent"), messageId: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type SendReviewerMessageInput = z.infer<typeof sendReviewerMessageInputSchema>
export type ReviewerMessageSending = z.infer<typeof reviewerMessageSendingSchema>
