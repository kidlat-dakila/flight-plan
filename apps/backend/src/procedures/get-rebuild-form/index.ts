import type { ProcedureContext } from "@/procedures/context"
import { buildStartForm } from "@/procedures/get-review/utils/start/build-start-form"
import { startableAgentsOf } from "@/procedures/get-review/utils/start/startable-agents"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import { buildRebuildForm } from "./utils/build-rebuild-form"
import type { GetRebuildFormInput, RebuildForm } from "./utils/schemas"

export const getRebuildForm = async (input: GetRebuildFormInput, context: ProcedureContext): Promise<RebuildForm | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, request, setup] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findRequest(key),
    context.setupStore.read(),
  ])
  if (artifact === null) return null
  const agentModels = await listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment)
  const startForm = buildStartForm(setup, startableAgentsOf(context.conversationEnvironment.spawners), agentModels)
  return buildRebuildForm({ mode: input.mode, startForm, request, commit: artifact.commit })
}
