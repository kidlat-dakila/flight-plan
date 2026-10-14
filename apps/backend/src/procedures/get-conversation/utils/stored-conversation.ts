import { z } from "zod"
import { AGENT_NAMES } from "@/procedures/get-setup/utils/setup"
import { DELIVERY_CHANNELS, QUESTION_ORIGINS, type Conversation } from "./conversation"

const JSON_INDENT = 2
const SCHEMA_VERSION = 1

const storedDate = z.iso.datetime().transform((text) => new Date(text))

const questionSchema = z.strictObject({
  id: z.string(),
  prompt: z.string(),
  detail: z.string().nullable(),
  options: z.array(z.strictObject({ label: z.string(), description: z.string() })),
  allowsMultiple: z.boolean(),
})

const eventSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("reviewer-message"),
    id: z.string(),
    body: z.string(),
    reference: z.string().nullable(),
    sentAt: storedDate,
  }),
  z.strictObject({ kind: z.literal("agent-message"), id: z.string(), body: z.string(), sentAt: storedDate }),
  z.strictObject({
    kind: z.literal("question-batch"),
    id: z.string(),
    origin: z.enum(QUESTION_ORIGINS),
    questions: z.array(questionSchema),
    askedAt: storedDate,
  }),
  z.strictObject({
    kind: z.literal("answers"),
    id: z.string(),
    batchId: z.string(),
    origin: z.enum(QUESTION_ORIGINS),
    answers: z.array(
      z.strictObject({ questionId: z.string(), pickedLabels: z.array(z.string()), text: z.string().nullable() }),
    ),
    answeredAt: storedDate,
  }),
  z.strictObject({
    kind: z.literal("questions-withdrawn"),
    id: z.string(),
    batchId: z.string(),
    reason: z.string(),
    withdrawnAt: storedDate,
  }),
  z.strictObject({
    kind: z.literal("delivery"),
    id: z.string(),
    throughSequence: z.number().int().nonnegative(),
    channel: z.enum(DELIVERY_CHANNELS),
    deliveredAt: storedDate,
  }),
  z.strictObject({ kind: z.literal("agent-failure"), id: z.string(), reason: z.string(), failedAt: storedDate }),
  z.strictObject({
    kind: z.literal("model-choice"),
    id: z.string(),
    agent: z.enum(AGENT_NAMES),
    model: z.string(),
    effort: z.string(),
    chosenAt: storedDate,
  }),
])

const storedConversationSchema = z.strictObject({
  schema: z.literal(SCHEMA_VERSION),
  sessionId: z.string().nullable(),
  journal: z.array(z.strictObject({ sequence: z.number().int().positive(), event: eventSchema })),
})

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const parseConversation = (text: string): Conversation | null => {
  const stored = storedConversationSchema.safeParse(parseJson(text))
  return stored.success ? { sessionId: stored.data.sessionId, journal: stored.data.journal } : null
}

export const formatConversation = (conversation: Conversation): string =>
  `${JSON.stringify({ schema: SCHEMA_VERSION, ...conversation }, null, JSON_INDENT)}\n`
