import { z } from "zod"

const MAX_MESSAGE_LENGTH = 20_000

export const sendAgentMessageInputShape = {
  repositoryName: z.string().min(1).describe("The repository's name in Flight Plan."),
  targetId: z.string().min(1).describe("pr-<number> for a pull request, branch-<name> for a branch."),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH).describe("The message, in Markdown."),
}

export const sendAgentMessageInputSchema = z.strictObject(sendAgentMessageInputShape)

export type SendAgentMessageInput = z.infer<typeof sendAgentMessageInputSchema>

export type AgentMessageSending
  = | { readonly kind: "sent", readonly note: string }
    | { readonly kind: "rejected", readonly message: string }
