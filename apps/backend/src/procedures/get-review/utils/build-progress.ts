import { openQuestionBatchesOf, type JournalEntry } from "@/procedures/get-conversation/utils/conversation"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { sectionsOf } from "@/procedures/read-artifact/utils/artifact-sections"
import { tallyNodes } from "@/procedures/read-artifact/utils/unwritten-work"
import { ALLOW_LABEL, DENY_LABEL } from "@/procedures/request-permission/utils/describe-permission"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { CompletionNotice, PermissionRequest, ReviewProgress } from "./schemas"
import type { ReviewRequest } from "./start/review-request"

export interface WritingActivity {
  readonly request: ReviewRequest | null
  readonly isAgentRunning: boolean
  readonly journal: readonly JournalEntry[]
  readonly prompt: string | null
}

export const NO_WRITING_ACTIVITY: WritingActivity = { request: null, isAgentRunning: false, journal: [], prompt: null }

type ProgressStanding = Pick<ReviewProgress, "state" | "label" | "message">

const PROMPT_LABELS = { label: "Copy the prompt", copiedMessage: "Prompt copied" }
const CHAT_HINT = "Send it a message in Chat to start it again."

const PERMISSION_LABELS = {
  description: "The agent is waiting for your answer before it goes on writing the review.",
  allowLabel: ALLOW_LABEL,
  denyLabel: DENY_LABEL,
  reasonLabel: "Tell the agent why, if you deny it",
}

const UNATTENDED: ProgressStanding = {
  state: "waiting",
  label: "Still being written",
  message: "A part that is missing has not been written yet.",
}

const WAITING_FOR_REVIEWER_AGENT: ProgressStanding = {
  state: "waiting",
  label: "Waiting for your agent",
  message: "Paste the prompt into your agent session. You can read the code meanwhile.",
}

const WRITTEN_BY_REVIEWER_AGENT: ProgressStanding = {
  state: "writing",
  label: "Your agent is writing the review",
  message: "You can read the code meanwhile. Each part appears as it is written.",
}

const lastFailureReasonOf = (journal: readonly JournalEntry[]): string | null => {
  const outcomes = journal.map((entry) => entry.event).filter((event) => event.kind === "agent-failure" || event.kind === "delivery")
  const last = outcomes.at(-1)
  return last?.kind === "agent-failure" ? last.reason : null
}

const stoppedStanding = (agentLabel: string, failureReason: string | null): ProgressStanding => ({
  state: "stopped",
  label: failureReason === null ? `${agentLabel} stopped before the review was finished` : `${agentLabel} could not write the review`,
  message: failureReason === null ? CHAT_HINT : `${failureReason} ${CHAT_HINT}`,
})

const standingOf = ({ request, isAgentRunning, journal }: WritingActivity, writtenCount: number): ProgressStanding => {
  if (request === null) return UNATTENDED
  if (request.writer.kind !== "agent") return writtenCount === 0 ? WAITING_FOR_REVIEWER_AGENT : WRITTEN_BY_REVIEWER_AGENT
  const agentLabel = AGENT_LABELS[request.writer.agent]
  return isAgentRunning
    ? {
        state: "writing",
        label: `${agentLabel} is writing the review`,
        message: "You can read the code meanwhile. Each part appears as it is written.",
      }
    : stoppedStanding(agentLabel, lastFailureReasonOf(journal))
}

const pendingPermissionOf = (journal: readonly JournalEntry[]): PermissionRequest | null => {
  const batch = openQuestionBatchesOf(journal).filter((open) => open.origin === "permission").at(-1)
  const question = batch?.questions.at(0)
  return batch === undefined || question === undefined
    ? null
    : { batchId: batch.id, questionId: question.id, title: question.prompt, detail: question.detail, ...PERMISSION_LABELS }
}

const countLabelOf = (writtenCount: number, totalCount: number): string =>
  `${String(writtenCount)} of ${String(totalCount)} parts written`

const isLeftToAuthor = (activity: WritingActivity): boolean => activity.request?.writer.kind === "author"

export const buildProgress = (artifact: ReviewArtifact, activity: WritingActivity): ReviewProgress | null => {
  if (artifact.status !== "drafting" || isLeftToAuthor(activity)) return null
  const tally = tallyNodes(artifact, sectionsOf(artifact))
  const totalCount = tally.complete + tally.incomplete
  const standing = standingOf(activity, tally.complete)
  return {
    ...standing,
    isWriting: standing.state !== "stopped",
    countLabel: countLabelOf(tally.complete, totalCount),
    writtenCount: tally.complete,
    totalCount,
    prompt: activity.request?.writer.kind === "manual" && activity.prompt !== null
      ? { ...PROMPT_LABELS, text: activity.prompt }
      : null,
    permission: activity.isAgentRunning ? pendingPermissionOf(activity.journal) : null,
  }
}

export const buildCompletionNotice = (artifact: ReviewArtifact): CompletionNotice | null =>
  artifact.status === "complete"
    ? { title: "Flight Plan Review ready", body: `${artifact.title} is ready to read.` }
    : null
