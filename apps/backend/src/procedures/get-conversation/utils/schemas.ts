import { z } from "zod"
import { proseSchema } from "@flightplan/configurations"

export const AGENT_STATES = ["not-running", "starting", "working", "waiting-for-reviewer", "listening", "failed"] as const

export const QUESTIONS_STATUSES = ["open", "answered", "withdrawn"] as const

export const conversationKeySchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
})

export const questionOptionSchema = z.strictObject({ label: z.string(), description: z.string() })

export const messageEntrySchema = z.strictObject({
  kind: z.literal("message"),
  id: z.string(),
  author: z.enum(["reviewer", "agent"]),
  authorLabel: z.string(),
  reference: z.string().nullable(),
  body: proseSchema,
  timeLabel: z.string(),
})

export const questionsEntrySchema = z.strictObject({
  kind: z.literal("questions"),
  id: z.string(),
  isPermission: z.boolean(),
  heading: z.string(),
  timeLabel: z.string(),
  status: z.enum(QUESTIONS_STATUSES),
  statusLabel: z.string(),
  questions: z.array(
    z.strictObject({
      id: z.string(),
      prompt: z.string(),
      detail: z.string().nullable(),
      allowsMultiple: z.boolean(),
      options: z.array(questionOptionSchema),
      answerLabel: z.string().nullable(),
    }),
  ),
})

export const conversationViewSchema = z.strictObject({
  agentState: z.enum(AGENT_STATES),
  agentStateLabel: z.string(),
  problem: z.string().nullable(),
  entries: z.array(z.discriminatedUnion("kind", [messageEntrySchema, questionsEntrySchema])),
})

export type ConversationKey = z.infer<typeof conversationKeySchema>
export type AgentState = (typeof AGENT_STATES)[number]
export type ConversationView = z.infer<typeof conversationViewSchema>
export type ConversationEntry = ConversationView["entries"][number]
