import type { ProcedureContext } from "@/procedures/context"
import { installedAgentsOf } from "./utils/agent-models"
import { buildSetupPage } from "./utils/build-setup-page"
import { listModelsOf } from "./utils/list-agent-models"
import { findRepositoryForges } from "./utils/repository-forges"
import type { GetSetupInput, SetupPage } from "./utils/schemas"
import type { AgentName } from "./utils/setup"
import type { AgentDetection } from "./utils/setup-environment"
import { resolveStep } from "./utils/setup-progress"

const agentsWithCli = (detections: readonly AgentDetection[]): readonly AgentName[] =>
  detections.filter((detection) => detection.hasCli).map((detection) => detection.agent)

export const getSetup = async (input: GetSetupInput, context: ProcedureContext): Promise<SetupPage> => {
  const setup = await context.setupStore.read()
  const step = resolveStep(setup, input.step)
  const [agentDetections, cliProbes, repositoryForges] = await Promise.all([
    step === "agents" ? context.setupEnvironment.detectAgents() : [],
    step === "forges" ? context.setupEnvironment.probeForgeClis() : [],
    step === "repositories" ? findRepositoryForges(setup, context.setupEnvironment) : {},
  ])
  const agentModels = await listModelsOf(
    [...new Set([...agentsWithCli(agentDetections), ...installedAgentsOf(setup.agents)])],
    context.setupEnvironment,
  )
  return buildSetupPage({ setup, step, agentDetections, agentModels, cliProbes, repositoryForges })
}
