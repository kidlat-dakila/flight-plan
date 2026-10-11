import type { JournalEntry } from "@/procedures/get-conversation/utils/conversation"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { tallyNodes } from "@/procedures/read-artifact/utils/unwritten-work"
import { BASE_PRESET_NAME, PRESET_SECTIONS, type ReviewArtifact } from "@flightplan/configurations"
import type { CompletionNotice, ReviewProgress } from "./schemas"
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
  if (request.writer.kind === "manual") return writtenCount === 0 ? WAITING_FOR_REVIEWER_AGENT : WRITTEN_BY_REVIEWER_AGENT
  const agentLabel = AGENT_LABELS[request.writer.agent]
  return isAgentRunning
    ? {
        state: "writing",
        label: `${agentLabel} is writing the review`,
        message: "You can read the code meanwhile. Each part appears as it is written.",
      }
    : stoppedStanding(agentLabel, lastFailureReasonOf(journal))
}

const countLabelOf = (writtenCount: number, totalCount: number): string =>
  `${String(writtenCount)} of ${String(totalCount)} parts written`

export const buildProgress = (artifact: ReviewArtifact, activity: WritingActivity): ReviewProgress | null => {
  if (artifact.status !== "drafting") return null
  const tally = tallyNodes(artifact, PRESET_SECTIONS[activity.request?.preset ?? BASE_PRESET_NAME])
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
  }
}

export const buildCompletionNotice = (artifact: ReviewArtifact): CompletionNotice | null =>
  artifact.status === "complete"
    ? { title: "Flight Plan Review ready", body: `${artifact.title} is ready to read.` }
    : null
