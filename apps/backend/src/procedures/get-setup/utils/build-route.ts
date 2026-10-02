import type { LabelSegment } from "@/procedures/list-repositories/utils/schemas"
import { AGENT_LABELS, CONNECTION_OFFERS } from "./agent-catalog"
import { FORGE_OFFERS } from "./forge-catalog"
import { PRESET_OFFERS } from "./preset-catalog"
import type { RouteStop } from "./schemas"
import { SETUP_STEPS, type AgentsChoice, type ForgesChoice, type Setup, type SetupStep } from "./setup"
import { isStepReachable, isStepSaved } from "./setup-progress"

type SummaryLines = readonly LabelSegment[][]

const STEP_LABELS: Record<SetupStep, string> = {
  agents: "Agents",
  forges: "Git forge",
  configuration: "Configuration",
  repositories: "Repositories",
}

const STEP_PURPOSES: Record<SetupStep, string> = {
  agents: "The coding agents that write your reviews",
  forges: "Where your pull requests are hosted",
  configuration: "How the agent writes a review",
  repositories: "The repositories and users to follow",
}

const STATE_LABELS: Record<RouteStop["state"], string> = {
  saved: "Saved",
  current: "Current step",
  upcoming: "Not reached",
}

const DEFAULT_MARK = " (default)"

const plain = (text: string): LabelSegment => ({ text, kind: "plain" })

const withDefaultMark = (label: string, isMarked: boolean): string => (isMarked ? `${label}${DEFAULT_MARK}` : label)

const agentLines = (choice: AgentsChoice): SummaryLines => [
  choice.installs.map((install) =>
    plain(withDefaultMark(AGENT_LABELS[install.agent], choice.installs.length > 1 && install.agent === choice.defaultAgent)),
  ),
  [plain(CONNECTION_OFFERS[choice.connection].summary)],
]

const forgeLines = (choice: ForgesChoice): SummaryLines => [
  choice.connections.map((connection) =>
    plain(
      withDefaultMark(
        FORGE_OFFERS[connection.forge].label,
        choice.connections.length > 1 && connection.forge === choice.defaultForge,
      ),
    ),
  ),
]

const SUMMARY_LINES: Record<SetupStep, (setup: Setup) => SummaryLines | null> = {
  agents: (setup) => (setup.agents === null ? null : agentLines(setup.agents)),
  forges: (setup) => (setup.forges === null ? null : forgeLines(setup.forges)),
  configuration: (setup) => (setup.preset === null ? null : [[plain(PRESET_OFFERS[setup.preset].label)]]),
  repositories: (setup) =>
    setup.repositories.length === 0 ? null : [setup.repositories.map((repository) => plain(repository.name))],
}

const stopStateOf = (setup: Setup, step: SetupStep, currentStep: SetupStep): RouteStop["state"] => {
  if (step === currentStep) return "current"
  return isStepSaved(setup, step) ? "saved" : "upcoming"
}

const toRouteStop = (setup: Setup, step: SetupStep, currentStep: SetupStep): RouteStop => {
  const state = stopStateOf(setup, step, currentStep)
  return {
    step,
    label: STEP_LABELS[step],
    state,
    stateLabel: STATE_LABELS[state],
    isReachable: isStepReachable(setup, step),
    lines: [...(SUMMARY_LINES[step](setup) ?? [[plain(STEP_PURPOSES[step])]])],
  }
}

export const buildRoute = (setup: Setup, currentStep: SetupStep): RouteStop[] =>
  SETUP_STEPS.map((step) => toRouteStop(setup, step, currentStep))
