import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import { parseProse } from "@flightplan/codegraph"
import type { ListenerPresence, RunningAgent } from "./agent-registry"
import {
  findAnswerSet,
  findWithdrawal,
  latestFailureOf,
  openQuestionBatchesOf,
  type Answer,
  type Conversation,
  type JournalEntry,
  type QuestionBatch,
} from "./conversation"
import type { AgentState, ConversationEntry, ConversationView } from "./schemas"

type QuestionsEntry = Extract<ConversationEntry, { kind: "questions" }>

export interface ConversationSnapshot {
  readonly conversation: Conversation
  readonly runningAgent: RunningAgent | null
  readonly listenerPresence: ListenerPresence
}

const NO_CODE_LINKS: ReadonlySet<string> = new Set()

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
    questions: batch.questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      detail: question.detail,
      allowsMultiple: question.allowsMultiple,
      options: question.options.map(({ label, description }) => ({ label, description })),
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
      body: parseProse(event.body, NO_CODE_LINKS),
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
      body: parseProse(event.body, NO_CODE_LINKS),
      timeLabel: formatRelativeTime(event.sentAt, now),
    }
  }
  return event.kind === "question-batch" ? toQuestionsEntry(event, journal, now) : null
}

export const buildConversation = (snapshot: ConversationSnapshot, now: Date): ConversationView => {
  const { journal } = snapshot.conversation
  const agentState = agentStateOf(snapshot)
  return {
    agentState,
    agentStateLabel: STATE_LABELS[agentState],
    problem: agentState === "failed" ? (latestFailureOf(journal)?.reason ?? null) : null,
    entries: journal.map((entry) => toEntry(entry, journal, now)).filter((entry) => entry !== null),
  }
}
