import type { LabelSegment } from "@/procedures/list-repositories/utils/schemas"
import { AGENT_LABELS } from "./agent-catalog"
import { effortLabelOf, modelLabelOf, type AgentModels } from "./agent-models"
import { presetLabelOf } from "./default-configuration"
import { FORGE_OFFERS } from "./forge-catalog"
import type { RouteStop } from "./schemas"
import { DEFAULT_EFFORT, DEFAULT_MODEL, SETUP_STEPS, type AgentInstall, type AgentsChoice, type ForgesChoice, type Setup, type SetupStep } from "./setup"
import { isStepReachable, isStepSaved } from "./setup-progress"

type SummaryLines = readonly LabelSegment[][]

const STEP_LABELS: Record<SetupStep, string> = {
  repositories: "Repositories",
  forges: "Git integration",
  agents: "Agent integration",
  configuration: "Review configuration",
}

const STEP_PURPOSES: Record<SetupStep, string> = {
  repositories: "Configure which repositories and team members Flight Plan follows",
  forges: "Configure how Flight Plan communicates with your git setup",
  agents: "Configure how Flight Plan communicates with your agent",
  configuration: "Configure how Flight Plan puts your reviews together",
}

const STATE_LABELS: Record<RouteStop["state"], string> = {
  saved: "Saved",
  current: "Current step",
  upcoming: "Not reached",
}

const DEFAULT_MARK = " (default)"

const plain = (text: string): LabelSegment => ({ text, kind: "plain" })

const withDefaultMark = (label: string, isMarked: boolean): string => (isMarked ? `${label}${DEFAULT_MARK}` : label)

const effortSummaryOf = (install: AgentInstall, agentModels: AgentModels): string =>
  `${effortLabelOf(install.agent, agentModels, install)} effort`

const SUMMARY_SEPARATOR = ", "

const installLabelOf = (install: AgentInstall, agentModels: AgentModels): string =>
  [
    AGENT_LABELS[install.agent],
    ...(install.model === DEFAULT_MODEL ? [] : [modelLabelOf(install.agent, agentModels, install.model)]),
    ...(install.effort === DEFAULT_EFFORT ? [] : [effortSummaryOf(install, agentModels)]),
  ].join(SUMMARY_SEPARATOR)

const agentLines = (choice: AgentsChoice, agentModels: AgentModels): SummaryLines => [
  choice.installs.map((install) =>
    plain(
      withDefaultMark(
        installLabelOf(install, agentModels),
        choice.installs.length > 1 && install.agent === choice.defaultAgent,
      ),
    ),
  ),
]

const forgeLines = (choice: ForgesChoice): SummaryLines => [
  choice.connections.map((connection) => plain(FORGE_OFFERS[connection.forge].label)),
]

const SUMMARY_LINES: Record<SetupStep, (setup: Setup, agentModels: AgentModels) => SummaryLines | null> = {
  repositories: (setup) =>
    setup.repositories.length === 0 ? null : [setup.repositories.map((repository) => plain(repository.name))],
  forges: (setup) => (setup.forges === null ? null : forgeLines(setup.forges)),
  agents: (setup, agentModels) => (setup.agents === null ? null : agentLines(setup.agents, agentModels)),
  configuration: (setup) => (setup.defaultConfiguration === null ? null : [[plain(presetLabelOf(setup.defaultConfiguration))]]),
}

const stopStateOf = (setup: Setup, step: SetupStep, currentStep: SetupStep): RouteStop["state"] => {
  if (step === currentStep) return "current"
  return isStepSaved(setup, step) ? "saved" : "upcoming"
}

const toRouteStop = (setup: Setup, step: SetupStep, currentStep: SetupStep, agentModels: AgentModels): RouteStop => {
  const state = stopStateOf(setup, step, currentStep)
  return {
    step,
    label: STEP_LABELS[step],
    state,
    stateLabel: STATE_LABELS[state],
    isReachable: isStepReachable(setup, step),
    lines: [...(SUMMARY_LINES[step](setup, agentModels) ?? [[plain(STEP_PURPOSES[step])]])],
  }
}

export const buildRoute = (setup: Setup, currentStep: SetupStep, agentModels: AgentModels): RouteStop[] =>
  SETUP_STEPS.map((step) => toRouteStop(setup, step, currentStep, agentModels))
