import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import {
  findQuestionBatch,
  type Answer,
  type AnswerSet,
  type JournalEntry,
  type Question,
  type ReviewerMessage,
} from "./conversation"

const PARAGRAPH_BREAK = "\n\n"
const NO_ANSWER = "(no answer)"

export const LISTEN_PATH_SUFFIX = "live/agent"

export const listenPathOf = (key: ReviewKey): string =>
  `/api/${encodeURIComponent(key.repositoryName)}/${encodeURIComponent(key.targetId)}/${LISTEN_PATH_SUFFIX}`

export const listenCommandOf = (serverUrl: string, key: ReviewKey): string => `curl -sN "${serverUrl}${listenPathOf(key)}"`

const formatReviewerMessage = (message: ReviewerMessage): string =>
  message.reference === null
    ? `The reviewer wrote:\n${message.body}`
    : `The reviewer wrote about ${message.reference}:\n${message.body}`

const formatAnswer = (question: Question | undefined, answer: Answer): string => {
  const parts = [...answer.pickedLabels, ...(answer.text === null ? [] : [answer.text])]
  const answerText = parts.length === 0 ? NO_ANSWER : parts.join("; ")
  return `- ${question?.prompt ?? answer.questionId}\n  ${answerText}`
}

const formatAnswerSet = (answerSet: AnswerSet, journal: readonly JournalEntry[]): string => {
  const questions = findQuestionBatch(journal, answerSet.batchId)?.questions ?? []
  const lines = answerSet.answers.map((answer) =>
    formatAnswer(questions.find((question) => question.id === answer.questionId), answer),
  )
  return [`The reviewer answered your questions (${answerSet.batchId}):`, ...lines].join("\n")
}

const formatInboundEntry = (entry: JournalEntry, journal: readonly JournalEntry[]): string | null => {
  if (entry.event.kind === "reviewer-message") return formatReviewerMessage(entry.event)
  if (entry.event.kind === "answers") return formatAnswerSet(entry.event, journal)
  return null
}

export const formatInbound = (entries: readonly JournalEntry[], journal: readonly JournalEntry[]): string =>
  entries
    .map((entry) => formatInboundEntry(entry, journal))
    .filter((text) => text !== null)
    .join(PARAGRAPH_BREAK)

export const formatListenPacket = (text: string, nextListenCommand: string): string =>
  [text, `When you are ready for the reviewer's next reply, run this in the background:\n${nextListenCommand}`].join(
    PARAGRAPH_BREAK,
  )

const describeTarget = (key: ReviewKey): string =>
  `repositoryName "${key.repositoryName}" and targetId "${key.targetId}"`

export const spawnInstructionsOf = (key: ReviewKey): string =>
  [
    `Flight Plan started this session for the reviewer of the review target with ${describeTarget(key)}.`,
    "Nobody reads this terminal. The reviewer reads you only in Flight Plan's web app.",
    `Reach the reviewer only through Flight Plan's MCP tools, always with ${describeTarget(key)}:`,
    "- send-message sends the reviewer a message. Send every answer, summary or result this way.",
    "- ask-questions asks the reviewer one question or a batch. After asking, end your turn without waiting: Flight Plan closes this session and resumes it with the answers.",
    "When the reviewer asks you to change the review artifact, change it through read, nodes and update-nodes, then tell them what you changed with send-message.",
    "Flight Plan's tools can take a few seconds to connect after this session starts or resumes, and may look unavailable or removed at first. If they do, end your turn: Flight Plan tells you when to use them.",
    "Never run the curl listen command that the tool descriptions mention. It is for sessions the reviewer started themselves.",
  ].join("\n")

export const MCP_INSTRUCTIONS = [
  "Flight Plan connects you with the reviewer of a pull request, who reads you in Flight Plan's web app.",
  "A review target is named by repositoryName (the repository's name in Flight Plan) and targetId (pr-<number> for a pull request, branch-<name> for a branch).",
  "A review artifact is filled in through get-instructions, read, nodes, update-nodes and complete. Flight Plan builds its structure when the reviewer starts the review, and these tools write the prose onto it. get-instructions says how to write each field, for the configuration the reviewer chose.",
  "send-message sends the reviewer a message. ask-questions asks one question or a batch; each question either offers options (one or several picks, and the reviewer can always write their own answer) or asks for free text.",
  "record-publication records the address of the Claude artifact a Flight Plan was published to. Call it only after Flight Plan asked you to publish one and your Artifact tool did.",
  "record-import stores a Flight Plan you fetched from a Claude artifact. Call it only after Flight Plan asked you to fetch one and you copied the file where it said.",
  "If Flight Plan started your session, its system prompt says so: end your turn after asking, and Flight Plan resumes you with the answers.",
  "If the reviewer started your session, the ask-questions result gives a curl command. Run it in the background. It exits when the reviewer replies, and its output holds the reply and the command to run for the next one.",
].join("\n")

export const REPLY_REMINDER = [
  "You have not written to the reviewer this turn, and the reviewer reads only what you send through Flight Plan.",
  "If send-message or ask-questions looked unavailable, they were still connecting and are available now.",
  "Send your reply with send-message, or ask with ask-questions.",
].join(" ")
