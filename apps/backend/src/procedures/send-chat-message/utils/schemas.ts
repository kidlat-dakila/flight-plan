import { z } from "zod"

const MAX_MESSAGE_LENGTH = 10_000

export const sendChatMessageInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  reference: z.string().nullable(),
})

export const sentChatMessageSchema = z.strictObject({ messageId: z.string() })

export type SendChatMessageInput = z.infer<typeof sendChatMessageInputSchema>
