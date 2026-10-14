import type { ProcedureContext } from "@/procedures/context"
import { deliverToAgent, type DeliveryOutcome } from "@/procedures/deliver-to-agent"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { targetTitleOf } from "@/procedures/get-review/utils/build-shell"
import { branchNameOf } from "@/procedures/get-review/utils/change-reader"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { offerAgents } from "@/procedures/get-review/utils/start/agent-offers"
import { buildReviewPrompt } from "@/procedures/get-review/utils/start/review-prompt"
import type { ReviewRequest } from "@/procedures/get-review/utils/start/review-request"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import { findConfiguration } from "@/procedures/list-configurations/utils/configuration"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { buildArtifact } from "./utils/build-artifact"
import { planReviewRequest } from "./utils/plan-review-request"
import type { RequestReviewInput, RequestReviewResult } from "./utils/schemas"
import { startingArtifactOf } from "./utils/starting-artifact"

const STARTED_MESSAGE = "Review started"
const PROMPT_COPIED_MESSAGE = "Prompt copied"
const CREATED_MESSAGE = "Flight Plan created"

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
  if (request.writer.kind === "author") return { prompt: null, message: CREATED_MESSAGE }
  const prompt = buildReviewPrompt(repository, target, key, request)
  return request.writer.kind === "manual"
    ? { prompt, message: PROMPT_COPIED_MESSAGE }
    : { prompt: null, message: await startAgent(key, prompt, context) }
}

export const requestReview = async (
  input: RequestReviewInput,
  context: ProcedureContext,
): Promise<RequestReviewResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [repositories, artifact, setup, savedConfigurations] = await Promise.all([
    context.repositoryStore.list(),
    context.reviewStore.findArtifact(key),
    context.setupStore.read(),
    context.configurationStore.read(),
  ])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined || artifact !== null) return null
  const agentModels = await listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment)
  const offers = offerAgents(setup.agents, startableAgentsOf(context.conversationEnvironment.spawners), agentModels)
  const planned = planReviewRequest(input, findConfiguration(savedConfigurations, input.configurationId), offers, context.now())
  if (planned.kind === "rejected") return planned
  const target = await findReviewTarget(repository, input.targetId, context)
  if (target === null) return null
  const opened = await context.openRepository(repository.path, setup.forges)
  const building = await buildArtifact(opened.resolved, {
    branchName: branchNameOf(target),
    title: targetTitleOf(target),
    newId: context.conversationEnvironment.newId,
  })
  if (building.kind === "unavailable") return building
  await context.reviewStore.writeScaffold(key, {
    artifact: startingArtifactOf(building.artifact, planned.request.writer, {
      sections: planned.configuration.sections,
      requiredContextKinds: planned.configuration.contextCodeBlockKinds,
    }),
    request: planned.request,
    baseCommit: building.baseCommit,
  })
  return { kind: "requested", ...await handToWriter({ key, repository, target, request: planned.request }, context) }
}
