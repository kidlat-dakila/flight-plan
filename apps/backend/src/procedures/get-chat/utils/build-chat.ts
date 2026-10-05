import type { ChatQuestion } from "@/procedures/get-review/utils/discussion"
import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import { parseProse } from "@flightplan/codegraph"
import type { AgentState, Chat } from "./schemas"

export const AGENT_START_MS = 2500
export const AGENT_ANSWER_MS = 2500
export const AGENT_IDLE_MS = 120_000

const NO_CODE_LINKS: ReadonlySet<string> = new Set()

const STATE_LABELS: Readonly<Record<AgentState, string>> = {
  "not-running": "Agent not running",
  "starting": "Agent starting",
  "running": "Agent running",
}

interface AnsweredQuestion {
  readonly question: ChatQuestion
  readonly startedAtMs: number | null
  readonly answeredAtMs: number
}

const withAnswerTime = (answered: readonly AnsweredQuestion[], question: ChatQuestion): AnsweredQuestion[] => {
  const previous = answered.find((_answer, position) => position === answered.length - 1)
  const sentAtMs = question.sentAt.getTime()
  const isAgentIdle = previous === undefined || sentAtMs - previous.answeredAtMs > AGENT_IDLE_MS
  return [
    ...answered,
    isAgentIdle
      ? { question, startedAtMs: sentAtMs + AGENT_START_MS, answeredAtMs: sentAtMs + AGENT_START_MS + AGENT_ANSWER_MS }
      : { question, startedAtMs: null, answeredAtMs: Math.max(sentAtMs, previous.answeredAtMs) + AGENT_ANSWER_MS },
  ]
}

const agentStateOf = (answered: readonly AnsweredQuestion[], nowMs: number): AgentState => {
  const last = answered.find((_answer, position) => position === answered.length - 1)
  if (last === undefined || nowMs - last.answeredAtMs > AGENT_IDLE_MS) return "not-running"
  return last.startedAtMs !== null && nowMs < last.startedAtMs ? "starting" : "running"
}

const answerTo = (question: ChatQuestion): string =>
  [
    "This is a sample answer. The chat is a prototype, and no agent is running behind it.",
    question.reference === null
      ? `You asked: "${question.body}"`
      : `You asked about \`${question.reference}\`: "${question.body}"`,
  ].join("\n\n")

const toMessages = ({ question, answeredAtMs }: AnsweredQuestion, now: Date): Chat["messages"] => [
  {
    id: question.id,
    author: "reviewer",
    authorLabel: "You",
    reference: question.reference,
    body: parseProse(question.body, NO_CODE_LINKS),
    timeLabel: formatRelativeTime(question.sentAt, now),
    isWaiting: false,
  },
  now.getTime() >= answeredAtMs
    ? {
        id: `${question.id}-answer`,
        author: "agent",
        authorLabel: "Agent",
        reference: null,
        body: parseProse(answerTo(question), NO_CODE_LINKS),
        timeLabel: formatRelativeTime(new Date(answeredAtMs), now),
        isWaiting: false,
      }
    : {
        id: `${question.id}-answer`,
        author: "agent",
        authorLabel: "Agent",
        reference: null,
        body: [],
        timeLabel: "Working on it",
        isWaiting: true,
      },
]

export const buildChat = (questions: readonly ChatQuestion[], now: Date): Chat => {
  const answered = questions.reduce<AnsweredQuestion[]>(withAnswerTime, [])
  const agentState = agentStateOf(answered, now.getTime())
  return {
    heading: "Chat with the agent",
    agentState,
    agentStateLabel: STATE_LABELS[agentState],
    notice: "Prototype. Answers are samples, and no agent is started.",
    emptyMessage: questions.length === 0 ? "Ask about this review. The agent starts with your first message." : null,
    placeholder: "Ask about this review",
    sendLabel: "Send",
    closeLabel: "Close the chat",
    askLabel: "Ask the agent",
    messages: answered.flatMap((answer) => toMessages(answer, now)),
  }
}
