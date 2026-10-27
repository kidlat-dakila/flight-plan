import type { ProcedureContext } from "@/procedures/context"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { buildReviewPrompt, toOneLine } from "@/procedures/get-review/utils/start/review-prompt"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentName } from "@/procedures/get-setup/utils/setup"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"

const CREATED_MESSAGE = "Flight Plan created"

export const externalStartMessage = (agent: AgentName): string =>
  `Run this line in ${AGENT_LABELS[agent]} to start explaining the review`

export const sentMessageOf = (agent: AgentName): string => `Sent to ${AGENT_LABELS[agent]}`

export const sendToAgent = async (key: ReviewKey, prompt: string, context: ProcedureContext): Promise<void> => {
  await appendAndPublish(
    key,
    [{ kind: "reviewer-message", id: context.conversationEnvironment.newId(), body: prompt, reference: null, excerpt: null, sentAt: context.now() }],
    context,
  )
}

export interface WritingJob {
  readonly key: ReviewKey
  readonly repository: Repository
  readonly target: ReviewTarget
  readonly request: ReviewRequest
}

export interface Handover {
  readonly prompt: string | null
  readonly message: string
}

export const handToWriter = async ({ key, repository, target, request }: WritingJob, context: ProcedureContext): Promise<Handover> => {
  const { writer } = request
  if (writer.kind === "author" || writer.kind === "none") return { prompt: null, message: CREATED_MESSAGE }
  const prompt = buildReviewPrompt(repository, target, key, request.writeUp)
  if (writer.kind === "external") return { prompt: toOneLine(prompt), message: externalStartMessage(writer.agent) }
  await sendToAgent(key, prompt, context)
  return { prompt: null, message: sentMessageOf(writer.agent) }
}
