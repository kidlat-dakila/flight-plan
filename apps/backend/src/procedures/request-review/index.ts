import type { ProcedureContext } from "@/procedures/context"
import { deliverToAgent, type DeliveryOutcome } from "@/procedures/deliver-to-agent"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { buildReviewPrompt, toOneLine } from "@/procedures/get-review/utils/start/review-prompt"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { AGENT_LABELS } from "@/procedures/get-setup/utils/agent-catalog"
import type { AgentName } from "@/procedures/get-setup/utils/setup"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"

const STARTED_MESSAGE = "Review started"
const CREATED_MESSAGE = "Flight Plan created"

export const externalStartMessage = (agent: AgentName): string =>
  `Run this line in ${AGENT_LABELS[agent]} to start explaining the review`

const unstartedMessage = (reason: string): string =>
  `The review is ready to read, but the agent did not start: ${reason}`

const startedMessageOf = (outcome: DeliveryOutcome): string => {
  if (outcome.kind === "failed" || outcome.kind === "unavailable") return unstartedMessage(outcome.reason)
  return STARTED_MESSAGE
}

export const sendToAgent = async (key: ReviewKey, prompt: string, context: ProcedureContext): Promise<DeliveryOutcome> => {
  await appendAndPublish(
    key,
    [{ kind: "reviewer-message", id: context.conversationEnvironment.newId(), body: prompt, reference: null, sentAt: context.now() }],
    context,
  )
  return await deliverToAgent(key, context)
}

const startAgent = async (key: ReviewKey, prompt: string, context: ProcedureContext): Promise<string> =>
  startedMessageOf(await sendToAgent(key, prompt, context))

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
  return writer.kind === "external"
    ? { prompt: toOneLine(prompt), message: externalStartMessage(writer.agent) }
    : { prompt: null, message: await startAgent(key, prompt, context) }
}
