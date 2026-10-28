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

export const listenPermissionRuleOf = (serverUrl: string): string => `Bash(curl -sN "${serverUrl}/api/*)`

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

export const LIVE_SKILL_COMMAND = "/flightplan:live"

export const liveCommandOf = (key: ReviewKey): string => `${LIVE_SKILL_COMMAND} ${key.repositoryName}/${key.targetId}`

const listenAgainOf = (nextListenCommand: string): string =>
  `When you have done everything above, listen again with this command, in the foreground:\n${nextListenCommand}`

export const formatListenPacket = (text: string, nextListenCommand: string): string =>
  [text, listenAgainOf(nextListenCommand)].join(PARAGRAPH_BREAK)

export const formatIdlePacket = (nextListenCommand: string): string =>
  [
    "Nothing new from the reviewer yet.",
    `Listen again with this command, in the foreground:\n${nextListenCommand}`,
  ].join(PARAGRAPH_BREAK)

export const formatStopPacket = (idleMinutes: number): string =>
  [
    `The reviewer has been away from this review for ${String(idleMinutes)} minutes, so Flight Plan ended this live session.`,
    "Do not listen again. Tell the reviewer in this terminal that the session ended because the review was idle, and stop. They can start a new session from the review page.",
  ].join(PARAGRAPH_BREAK)

export const listenInstructionOf = (command: string): string =>
  `The reviewer's reply comes on your listening stream. If you are not listening yet, run this in the foreground. It exits when the reviewer replies, and its output holds the reply:\n${command}`

export const MCP_INSTRUCTIONS = [
  "Flight Plan connects you with the reviewer of a pull request, who reads you in Flight Plan's web app.",
  "A review target is named by repositoryName (the repository's name in Flight Plan) and targetId (pr-<number> for a pull request, branch-<name> for a branch).",
  "A review artifact is filled in through get-instructions, read, nodes, update-nodes and complete. Flight Plan builds its structure when the reviewer creates the review artifact, and these tools write the prose onto it. get-instructions says how to write each field, for the configuration the reviewer chose.",
  "send-message sends the reviewer a message. ask-questions asks one question or a batch; each question either offers options (one or several picks, and the reviewer can always write their own answer) or asks for free text.",
  "record-publication records the address of the Claude artifact a Flight Plan was published to. Call it only after Flight Plan asked you to publish one and your Artifact tool did.",
  "record-import stores a Flight Plan you fetched from a Claude artifact. Call it only after Flight Plan asked you to fetch one and you copied the file where it said.",
  "troubleshoot returns an error Flight Plan logged, or what the user asked it to troubleshoot, by the log id after /flightplan:troubleshoot. It takes no review target.",
  "Flight Plan shows the reviewer whether an agent is online for their review. Every call to these tools counts, and ping counts when you have nothing else to call. While you work on a review without calling Flight Plan, call ping at least every 5 seconds.",
  "Requests from the reviewer arrive on the review's listening stream: a curl command the tool results give you. It waits until there is something to do, prints it with the command to listen again, and exits.",
  "When the reviewer has been away from the review for a while, the listening stream sends a stop event instead. Then do not listen again: stop serving the review.",
].join("\n")
