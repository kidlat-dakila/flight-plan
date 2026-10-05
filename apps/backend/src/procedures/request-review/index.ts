import type { ProcedureContext } from "@/procedures/context"
import { deliverToAgent, type DeliveryOutcome } from "@/procedures/deliver-to-agent"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { targetTitleOf } from "@/procedures/get-review/utils/build-shell"
import { branchNameOf } from "@/procedures/get-review/utils/change-reader"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { offerAgents } from "@/procedures/get-review/utils/start/agent-offers"
import { buildReviewPrompt } from "@/procedures/get-review/utils/start/review-prompt"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { planReviewRequest } from "./utils/plan-review-request"
import { readChange } from "./utils/read-change"
import { buildScaffold } from "./utils/scaffold/build-scaffold"
import type { RequestReviewInput, RequestReviewResult } from "./utils/schemas"

const STARTED_MESSAGE = "Review started"
const PROMPT_COPIED_MESSAGE = "Prompt copied"

const unstartedMessage = (reason: string): string =>
  `The review is ready to read, but the agent did not start: ${reason}`

const startedMessageOf = (outcome: DeliveryOutcome): string => {
  if (outcome.kind === "failed" || outcome.kind === "unavailable") return unstartedMessage(outcome.reason)
  return STARTED_MESSAGE
}

const startAgent = async (key: ReviewKey, prompt: string, context: ProcedureContext): Promise<string> => {
  await appendAndPublish(
    key,
    [{ kind: "reviewer-message", id: context.conversationEnvironment.newId(), body: prompt, reference: null, sentAt: context.now() }],
    context,
  )
  return startedMessageOf(await deliverToAgent(key, context))
}

export const requestReview = async (
  input: RequestReviewInput,
  context: ProcedureContext,
): Promise<RequestReviewResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [repositories, artifact, setup] = await Promise.all([
    context.repositoryStore.list(),
    context.reviewStore.findArtifact(key),
    context.setupStore.read(),
  ])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  const target = repository?.targets.find((candidate) => targetIdOf(candidate) === input.targetId)
  if (repository === undefined || target === undefined || artifact !== null) return null
  const agentModels = await listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment)
  const offers = offerAgents(setup.agents, startableAgentsOf(context.conversationEnvironment.spawners), agentModels)
  const planned = planReviewRequest(input, offers, context.now())
  if (planned.kind === "rejected") return planned
  const change = await readChange(context.changeReader, repository.path, branchNameOf(target), targetTitleOf(target))
  if (change.kind === "unavailable") return change
  await context.reviewStore.writeScaffold(key, {
    artifact: buildScaffold(change.snapshot),
    request: planned.request,
    baseCommit: change.revision.baseCommit,
  })
  const prompt = buildReviewPrompt(repository, target, key, planned.request)
  return planned.request.writer.kind === "manual"
    ? { kind: "requested", prompt, message: PROMPT_COPIED_MESSAGE }
    : { kind: "requested", prompt: null, message: await startAgent(key, prompt, context) }
}
