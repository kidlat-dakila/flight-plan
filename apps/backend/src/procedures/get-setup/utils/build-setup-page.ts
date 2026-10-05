import type { AgentModels } from "./agent-models"
import { buildAgentsStep } from "./build-agents-step"
import { buildConfigurationStep } from "./build-configuration-step"
import { buildForgesStep } from "./build-forges-step"
import { buildRepositoriesStep } from "./build-repositories-step"
import { buildRoute } from "./build-route"
import type { SetupPage, SetupStepForm } from "./schemas"
import { SETUP_STEPS, type RepositoryForges, type Setup, type SetupStep } from "./setup"
import type { AgentDetection, CliProbe } from "./setup-environment"
import { stepBefore, stepNumberOf } from "./setup-progress"

export interface SetupPageSource {
  readonly setup: Setup
  readonly step: SetupStep
  readonly agentDetections: readonly AgentDetection[]
  readonly agentModels: AgentModels
  readonly cliProbes: readonly CliProbe[]
  readonly repositoryForges: RepositoryForges
}

const FORM_BUILDERS: Record<SetupStep, (source: SetupPageSource) => SetupStepForm> = {
  agents: (source) => buildAgentsStep(source.setup.agents, source.agentDetections, source.agentModels),
  forges: (source) => buildForgesStep(source.setup.forges, source.cliProbes),
  configuration: (source) => buildConfigurationStep(source.setup.preset),
  repositories: (source) => buildRepositoriesStep(source.setup, source.repositoryForges),
}

export const buildSetupPage = (source: SetupPageSource): SetupPage => ({
  progressLabel: `Step ${String(stepNumberOf(source.step))} of ${String(SETUP_STEPS.length)}`,
  route: buildRoute(source.setup, source.step, source.agentModels),
  backStep: stepBefore(source.step),
  form: FORM_BUILDERS[source.step](source),
})
