import { buildAgentsStep } from "./build-agents-step"
import { buildConfigurationStep } from "./build-configuration-step"
import { buildForgesStep } from "./build-forges-step"
import { buildRepositoriesStep } from "./build-repositories-step"
import { buildRoute } from "./build-route"
import type { SetupPage, SetupStepForm } from "./schemas"
import { SETUP_STEPS, type Setup, type SetupStep } from "./setup"
import type { AgentDetection, CliProbe } from "./setup-environment"
import { stepBefore, stepNumberOf } from "./setup-progress"

export interface SetupPageSource {
  readonly setup: Setup
  readonly step: SetupStep
  readonly agentDetections: readonly AgentDetection[]
  readonly cliProbes: readonly CliProbe[]
}

const FORM_BUILDERS: Record<SetupStep, (source: SetupPageSource) => SetupStepForm> = {
  agents: (source) => buildAgentsStep(source.setup.agents, source.agentDetections),
  forges: (source) => buildForgesStep(source.setup.forges, source.cliProbes),
  configuration: (source) => buildConfigurationStep(source.setup.preset),
  repositories: (source) => buildRepositoriesStep(source.setup),
}

export const buildSetupPage = (source: SetupPageSource): SetupPage => ({
  progressLabel: `Step ${String(stepNumberOf(source.step))} of ${String(SETUP_STEPS.length)}`,
  route: buildRoute(source.setup, source.step),
  backStep: stepBefore(source.step),
  form: FORM_BUILDERS[source.step](source),
})
