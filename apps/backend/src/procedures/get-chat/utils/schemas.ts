import { z } from "zod"
import { proseSchema } from "@/procedures/get-review/utils/schemas"

export const AGENT_STATES = ["not-running", "starting", "running"] as const

export const getChatInputSchema = z.strictObject({ repositoryName: z.string(), targetId: z.string() })

export const chatSchema = z.strictObject({
  heading: z.string(),
  agentState: z.enum(AGENT_STATES),
  agentStateLabel: z.string(),
  notice: z.string(),
  emptyMessage: z.string().nullable(),
  placeholder: z.string(),
  sendLabel: z.string(),
  closeLabel: z.string(),
  askLabel: z.string(),
  messages: z.array(
    z.strictObject({
      id: z.string(),
      author: z.enum(["reviewer", "agent"]),
      authorLabel: z.string(),
      reference: z.string().nullable(),
      body: proseSchema,
      timeLabel: z.string(),
      isWaiting: z.boolean(),
    }),
  ),
})

export type AgentState = (typeof AGENT_STATES)[number]
export type GetChatInput = z.infer<typeof getChatInputSchema>
export type Chat = z.infer<typeof chatSchema>
