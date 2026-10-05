import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export const QUESTION_ORIGINS = ["agent", "permission"] as const

export type QuestionOrigin = (typeof QUESTION_ORIGINS)[number]

export const DELIVERY_CHANNELS = ["listener", "spawn", "turn-end"] as const

export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number]

export interface QuestionOption {
  readonly label: string
  readonly description: string
}

export interface Question {
  readonly id: string
  readonly prompt: string
  readonly detail: string | null
  readonly options: readonly QuestionOption[]
  readonly allowsMultiple: boolean
}

export interface Answer {
  readonly questionId: string
  readonly pickedLabels: readonly string[]
  readonly text: string | null
}

export interface ReviewerMessage {
  readonly kind: "reviewer-message"
  readonly id: string
  readonly body: string
  readonly reference: string | null
  readonly sentAt: Date
}

export interface AgentMessage {
  readonly kind: "agent-message"
  readonly id: string
  readonly body: string
  readonly sentAt: Date
}

export interface QuestionBatch {
  readonly kind: "question-batch"
  readonly id: string
  readonly origin: QuestionOrigin
  readonly questions: readonly Question[]
  readonly askedAt: Date
}

export interface AnswerSet {
  readonly kind: "answers"
  readonly id: string
  readonly batchId: string
  readonly origin: QuestionOrigin
  readonly answers: readonly Answer[]
  readonly answeredAt: Date
}

export interface QuestionsWithdrawn {
  readonly kind: "questions-withdrawn"
  readonly id: string
  readonly batchId: string
  readonly reason: string
  readonly withdrawnAt: Date
}

export interface Delivery {
  readonly kind: "delivery"
  readonly id: string
  readonly throughSequence: number
  readonly channel: DeliveryChannel
  readonly deliveredAt: Date
}

export interface AgentFailure {
  readonly kind: "agent-failure"
  readonly id: string
  readonly reason: string
  readonly failedAt: Date
}

export type ConversationEvent
  = | ReviewerMessage
    | AgentMessage
    | QuestionBatch
    | AnswerSet
    | QuestionsWithdrawn
    | Delivery
    | AgentFailure

export interface JournalEntry {
  readonly sequence: number
  readonly event: ConversationEvent
}

export interface Conversation {
  readonly sessionId: string | null
  readonly journal: readonly JournalEntry[]
}

export interface Appending {
  readonly conversation: Conversation
  readonly entries: readonly JournalEntry[]
}

export const EMPTY_CONVERSATION: Conversation = { sessionId: null, journal: [] }

const FIRST_SEQUENCE = 1
const NO_SEQUENCE = 0

export const lastSequenceOf = (journal: readonly JournalEntry[]): number =>
  journal.reduce((highest, entry) => Math.max(highest, entry.sequence), NO_SEQUENCE)

export const appendEvents = (conversation: Conversation, events: readonly ConversationEvent[]): Appending => {
  const firstSequence = Math.max(lastSequenceOf(conversation.journal) + 1, FIRST_SEQUENCE)
  const entries = events.map((event, index) => ({ sequence: firstSequence + index, event }))
  return { conversation: { ...conversation, journal: [...conversation.journal, ...entries] }, entries }
}

export const isInbound = (event: ConversationEvent): boolean =>
  event.kind === "reviewer-message" || (event.kind === "answers" && event.origin === "agent")

export const isOutbound = (event: ConversationEvent): boolean =>
  event.kind === "agent-message" || (event.kind === "question-batch" && event.origin === "agent")

export const lastDeliveredSequenceOf = (journal: readonly JournalEntry[]): number =>
  journal.reduce(
    (highest, { event }) => (event.kind === "delivery" ? Math.max(highest, event.throughSequence) : highest),
    NO_SEQUENCE,
  )

export const inboundAfter = (journal: readonly JournalEntry[], sequence: number): readonly JournalEntry[] =>
  journal.filter((entry) => entry.sequence > sequence && isInbound(entry.event))

export const pendingInboundOf = (journal: readonly JournalEntry[]): readonly JournalEntry[] =>
  inboundAfter(journal, lastDeliveredSequenceOf(journal))

export const hasOutboundAfter = (journal: readonly JournalEntry[], sequence: number): boolean =>
  journal.some((entry) => entry.sequence > sequence && isOutbound(entry.event))

export const findQuestionBatch = (journal: readonly JournalEntry[], batchId: string): QuestionBatch | null =>
  journal
    .map(({ event }) => event)
    .find((event): event is QuestionBatch => event.kind === "question-batch" && event.id === batchId)
    ?? null

export const findAnswerSet = (journal: readonly JournalEntry[], batchId: string): AnswerSet | null =>
  journal
    .map(({ event }) => event)
    .find((event): event is AnswerSet => event.kind === "answers" && event.batchId === batchId)
    ?? null

export const findWithdrawal = (journal: readonly JournalEntry[], batchId: string): QuestionsWithdrawn | null =>
  journal
    .map(({ event }) => event)
    .find((event): event is QuestionsWithdrawn => event.kind === "questions-withdrawn" && event.batchId === batchId)
    ?? null

export const isBatchSettled = (journal: readonly JournalEntry[], batchId: string): boolean =>
  findAnswerSet(journal, batchId) !== null || findWithdrawal(journal, batchId) !== null

export const openQuestionBatchesOf = (journal: readonly JournalEntry[]): readonly QuestionBatch[] =>
  journal
    .map(({ event }) => event)
    .filter((event): event is QuestionBatch => event.kind === "question-batch")
    .filter((batch) => !isBatchSettled(journal, batch.id))

export const latestFailureOf = (journal: readonly JournalEntry[]): AgentFailure | null =>
  journal.reduce<AgentFailure | null>((latest, { event }) => {
    if (event.kind === "agent-failure") return event
    return event.kind === "delivery" ? null : latest
  }, null)

export const reviewKeyId = (key: ReviewKey): string => `${key.repositoryName}\n${key.targetId}`
