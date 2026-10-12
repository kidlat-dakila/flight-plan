import type { ProcedureContext } from "@/procedures/context"
import { targetTitleOf } from "@/procedures/get-review/utils/build-shell"
import { branchNameOf } from "@/procedures/get-review/utils/change-reader"
import { offerAgents } from "@/procedures/get-review/utils/start/agent-offers"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { handToWriter } from "@/procedures/request-review"
import { buildArtifact } from "@/procedures/request-review/utils/build-artifact"
import { planReviewRequest } from "@/procedures/request-review/utils/plan-review-request"
import { pullFailureMessage } from "./utils/branch-puller"
import { planRebuild } from "./utils/plan-rebuild"
import type { RebuildReviewInput, RebuildReviewResult } from "./utils/schemas"

const NOTHING_TO_WRITE_MESSAGE = "The Flight Plan is up to date, and nothing in it needed rewriting"
const COMPLETE_STATUS = "complete"

export const rebuildReview = async (
  input: RebuildReviewInput,
  context: ProcedureContext,
): Promise<RebuildReviewResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [repositories, previous, previousRequest, setup] = await Promise.all([
    context.repositoryStore.list(),
    context.reviewStore.findArtifact(key),
    context.reviewStore.findRequest(key),
    context.setupStore.read(),
  ])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  const target = repository?.targets.find((candidate) => targetIdOf(candidate) === input.targetId)
  if (repository === undefined || target === undefined || previous === null) return null
  const agentModels = await listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment)
  const offers = offerAgents(setup.agents, startableAgentsOf(context.conversationEnvironment.spawners), agentModels)
  const planned = planReviewRequest(input, offers, context.now())
  if (planned.kind === "rejected") return planned
  const branchName = branchNameOf(target)
  const pull = await context.pullBranch(repository.path, branchName)
  if (pull.kind === "failed") return { kind: "unavailable", message: pullFailureMessage(pull.reason) }
  const opened = await context.openRepository(repository.path, setup.forges)
  const building = await buildArtifact(opened.resolved, {
    branchName,
    title: targetTitleOf(target),
    newId: context.conversationEnvironment.newId,
  })
  if (building.kind === "unavailable") return building
  const artifact = planRebuild({
    mode: input.mode,
    previous,
    previousRequest,
    rebuilt: building.artifact,
    request: planned.request,
  })
  await context.reviewStore.writeScaffold(key, { artifact, request: planned.request, baseCommit: building.baseCommit })
  if (artifact.status === COMPLETE_STATUS) return { kind: "rebuilt", prompt: null, message: NOTHING_TO_WRITE_MESSAGE }
  return { kind: "rebuilt", ...await handToWriter({ key, repository, target, request: planned.request }, context) }
}
