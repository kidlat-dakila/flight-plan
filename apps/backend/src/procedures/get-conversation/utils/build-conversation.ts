import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import { codeLinkIdsIn, parseProse } from "@flightplan/codegraph"
import type { Prose } from "@flightplan/configurations"
import type { ListenerPresence, RunningAgent } from "./agent-registry"
import {
  findAnswerSet,
  findWithdrawal,
  latestFailureOf,
  openQuestionBatchesOf,
  type Answer,
  type Conversation,
  type JournalEntry,
  type Question,
  type QuestionBatch,
} from "./conversation"
import type { AgentState, ConversationEntry, ConversationView } from "./schemas"

type QuestionsEntry = Extract<ConversationEntry, { kind: "questions" }>

export interface ConversationSnapshot {
  readonly conversation: Conversation
  readonly runningAgent: RunningAgent | null
  readonly listenerPresence: ListenerPresence
}

const parseMessage = (body: string): Prose => parseProse(body, new Set(codeLinkIdsIn([body])))

const STATE_LABELS: Readonly<Record<AgentState, string>> = {
  "not-running": "Agent not running",
  "starting": "Agent starting",
  "working": "Agent working",
  "waiting-for-reviewer": "Agent waiting for your answers",
  "listening": "Agent listening",
  "failed": "Agent could not start",
}

const REVIEWER_LABEL = "You"
const AGENT_LABEL = "Agent"
const PERMISSION_HEADING = "The agent asks for permission"
const OPEN_STATUS_LABEL = "Waiting for your answer"
const ANSWERED_STATUS_LABEL = "Answered"
const ANSWER_SEPARATOR = "; "
const PERMISSION_SUBMIT_LABEL = "Send"
const PERMISSION_TEXT_LABEL = "Why, for the agent (optional)"
const OWN_ANSWER_LABEL = "Your own answer"
const FREE_TEXT_LABEL = "Your answer"

const PANEL_LABELS = {
  heading: "Chat with the agent",
  closeLabel: "Close the chat",
  placeholder: "Ask about this review",
  sendLabel: "Send",
} as const

const EMPTY_MESSAGE = "Ask about this review. The agent starts with your first message."

const runningStateOf = (agent: RunningAgent): AgentState => {
  if (agent.phase === "starting") return "starting"
  return agent.isAwaitingPermission ? "waiting-for-reviewer" : "working"
}

const agentStateOf = ({ conversation, runningAgent, listenerPresence }: ConversationSnapshot): AgentState => {
  if (runningAgent !== null && runningAgent.closing === null) return runningStateOf(runningAgent)
  if (listenerPresence.openCount > 0) return "listening"
  if (openQuestionBatchesOf(conversation.journal).length > 0) return "waiting-for-reviewer"
  return latestFailureOf(conversation.journal) === null ? "not-running" : "failed"
}

const headingOf = (batch: QuestionBatch): string => {
  if (batch.origin === "permission") return PERMISSION_HEADING
  return batch.questions.length === 1
    ? "The agent asks a question"
    : `The agent asks ${String(batch.questions.length)} questions`
}

const submitLabelOf = (batch: QuestionBatch): string => {
  if (batch.origin === "permission") return PERMISSION_SUBMIT_LABEL
  return batch.questions.length === 1 ? "Send your answer" : "Send your answers"
}

const textLabelOf = (batch: QuestionBatch, question: Question): string => {
  if (batch.origin === "permission") return PERMISSION_TEXT_LABEL
  return question.options.length === 0 ? FREE_TEXT_LABEL : OWN_ANSWER_LABEL
}

const answerLabelOf = (answer: Answer | undefined): string | null => {
  if (answer === undefined) return null
  const parts = [...answer.pickedLabels, ...(answer.text === null ? [] : [answer.text])]
  return parts.length === 0 ? null : parts.join(ANSWER_SEPARATOR)
}

const statusOf = (isAnswered: boolean, isWithdrawn: boolean): QuestionsEntry["status"] => {
  if (isAnswered) return "answered"
  return isWithdrawn ? "withdrawn" : "open"
}

const toQuestionsEntry = (batch: QuestionBatch, journal: readonly JournalEntry[], now: Date): QuestionsEntry => {
  const answerSet = findAnswerSet(journal, batch.id)
  const withdrawal = findWithdrawal(journal, batch.id)
  const status = statusOf(answerSet !== null, withdrawal !== null)
  const statusLabels = { open: OPEN_STATUS_LABEL, answered: ANSWERED_STATUS_LABEL, withdrawn: withdrawal?.reason ?? "" }
  return {
    kind: "questions",
    id: batch.id,
    isPermission: batch.origin === "permission",
    heading: headingOf(batch),
    timeLabel: formatRelativeTime(batch.askedAt, now),
    status,
    statusLabel: statusLabels[status],
    submitLabel: submitLabelOf(batch),
    questions: batch.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      detail: question.detail,
      allowsMultiple: question.allowsMultiple,
      options: question.options.map(({ label, description }) => ({ label, description })),
      textLabel: textLabelOf(batch, question),
      answerLabel: answerLabelOf(answerSet?.answers.find((answer) => answer.questionId === question.id)),
    })),
  }
}

const toEntry = ({ event }: JournalEntry, journal: readonly JournalEntry[], now: Date): ConversationEntry | null => {
  if (event.kind === "reviewer-message") {
    return {
      kind: "message",
      id: event.id,
      author: "reviewer",
      authorLabel: REVIEWER_LABEL,
      reference: event.reference,
      body: parseMessage(event.body),
      timeLabel: formatRelativeTime(event.sentAt, now),
    }
  }
  if (event.kind === "agent-message") {
    return {
      kind: "message",
      id: event.id,
      author: "agent",
      authorLabel: AGENT_LABEL,
      reference: null,
      body: parseMessage(event.body),
      timeLabel: formatRelativeTime(event.sentAt, now),
    }
  }
  return event.kind === "question-batch" ? toQuestionsEntry(event, journal, now) : null
}

export const buildConversation = (snapshot: ConversationSnapshot, now: Date): ConversationView => {
  const { journal } = snapshot.conversation
  const agentState = agentStateOf(snapshot)
  const entries = journal.map((entry) => toEntry(entry, journal, now)).filter((entry) => entry !== null)
  return {
    ...PANEL_LABELS,
    emptyMessage: entries.length === 0 ? EMPTY_MESSAGE : null,
    agentState,
    agentStateLabel: STATE_LABELS[agentState],
    problem: agentState === "failed" ? (latestFailureOf(journal)?.reason ?? null) : null,
    entries,
  }
}
