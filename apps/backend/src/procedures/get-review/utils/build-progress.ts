import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import { tallyNodes } from "@/procedures/read-artifact/utils/unwritten-work"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { CompletionNotice, ReviewProgress } from "./schemas"
import type { ReviewRequest } from "./start/review-request"

export interface WritingActivity {
  readonly request: ReviewRequest | null
  readonly isAgentOnline: boolean
  readonly prompt: string | null
}

export const NO_WRITING_ACTIVITY: WritingActivity = { request: null, isAgentOnline: false, prompt: null }

type ProgressStanding = Pick<ReviewProgress, "state" | "label" | "message">

const PROMPT_LABELS = { label: "Copy the line", copiedMessage: "Line copied" }

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

const liveAgentStanding = (agentLabel: string, isAgentOnline: boolean): ProgressStanding =>
  isAgentOnline
    ? {
        state: "writing",
        label: `${agentLabel} is writing the review`,
        message: "You can read the code meanwhile. Each part appears as it is written.",
      }
    : {
        state: "waiting",
        label: `Waiting for ${agentLabel}`,
        message: `${agentLabel} writes the review once it is online. You can read the code meanwhile.`,
      }

const standingOf = ({ request, isAgentOnline }: WritingActivity, writtenCount: number): ProgressStanding => {
  if (request === null) return UNATTENDED
  if (request.writer.kind !== "agent") return writtenCount === 0 ? WAITING_FOR_REVIEWER_AGENT : WRITTEN_BY_REVIEWER_AGENT
  return liveAgentStanding(AGENT_LABELS[request.writer.agent], isAgentOnline)
}

const countLabelOf = (writtenCount: number, totalCount: number): string =>
  `${String(writtenCount)} of ${String(totalCount)} parts written`

const isAgentWriting = ({ request, isAgentOnline }: WritingActivity): boolean => {
  if (request?.writer.kind === "external") return true
  return request?.writer.kind === "agent" && isAgentOnline
}

export const isWritingNow = (artifact: ReviewArtifact, activity: WritingActivity): boolean =>
  artifact.status === "drafting" && isAgentWriting(activity)

const isWaitingForLiveAgent = ({ request, isAgentOnline }: WritingActivity): boolean =>
  request?.writer.kind === "agent" && !isAgentOnline

const isLeftToNoAgent = (activity: WritingActivity): boolean =>
  activity.request?.writer.kind === "author" || activity.request?.writer.kind === "none"

export const buildProgress = (artifact: ReviewArtifact, activity: WritingActivity): ReviewProgress | null => {
  if (artifact.status !== "drafting" || isLeftToNoAgent(activity)) return null
  const tally = tallyNodes(artifact)
  const totalCount = tally.complete + tally.incomplete
  const standing = standingOf(activity, tally.complete)
  return {
    ...standing,
    isWriting: !isWaitingForLiveAgent(activity),
    countLabel: countLabelOf(tally.complete, totalCount),
    writtenCount: tally.complete,
    totalCount,
    prompt: activity.request?.writer.kind === "external" && activity.prompt !== null
      ? { ...PROMPT_LABELS, text: activity.prompt }
      : null,
  }
}

export const buildCompletionNotice = (artifact: ReviewArtifact): CompletionNotice | null =>
  artifact.status === "complete"
    ? { title: "Flight Plan Review ready", body: `${artifact.title} is ready to read.` }
    : null
