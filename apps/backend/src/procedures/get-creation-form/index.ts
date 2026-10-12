import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import { buildStartForm } from "@/procedures/get-review/utils/start/build-start-form"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { offerTarget } from "@/procedures/search-creation-targets"
import { toTargetOption } from "@/procedures/search-creation-targets/utils/build-target-suggestions"
import type { TargetOption } from "@/procedures/search-creation-targets/utils/schemas"
import { buildCreationForm } from "./utils/build-creation-form"
import type { CreationForm, GetCreationFormInput } from "./utils/schemas"

const findSelectedTarget = async (
  repository: Repository,
  targetId: string | null,
  context: ProcedureContext,
): Promise<TargetOption | null> => {
  const target = targetId === null ? null : await findReviewTarget(repository, targetId, context)
  if (target === null) return null
  const offered = await offerTarget(repository.name, target, context)
  return offered.hasFlightPlan ? null : toTargetOption(offered, context.now())
}

export const getCreationForm = async (
  input: GetCreationFormInput,
  context: ProcedureContext,
): Promise<CreationForm | null> => {
  const [repositories, setup] = await Promise.all([context.repositoryStore.list(), context.setupStore.read()])
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  if (repository === undefined) return null
  const [agentModels, selectedTarget] = await Promise.all([
    listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment),
    findSelectedTarget(repository, input.targetId, context),
  ])
  const startForm = buildStartForm(setup, startableAgentsOf(context.conversationEnvironment.spawners), agentModels)
  return buildCreationForm({ repositoryName: repository.name, startForm, selectedTarget })
}
