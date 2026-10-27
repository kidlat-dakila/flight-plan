import { AGENT_CLI_NAMES, AGENT_LABELS } from "./agent-catalog"
import {
  offeredEffortOf,
  offerModels,
  savedEffortOf,
  savedModelOf,
  toModelOption,
  type AgentModels,
} from "./agent-models"
import type { AgentsStep } from "./schemas"
import {
  AGENT_NAMES,
  DEFAULT_MODEL,
  DEFAULT_TERMINAL_APP,
  TERMINAL_APPS,
  type AgentName,
  type AgentsChoice,
  type TerminalApp,
} from "./setup"
import type { AgentDetection } from "./setup-environment"
import { TERMINAL_APP_LABELS } from "./terminal-catalog"

type AgentOption = AgentsStep["agents"][number]

type TerminalAppOption = AgentsStep["terminalApps"][number]

type AgentLocation = Pick<AgentOption, "isPicked" | "installPath" | "pathHint">

const SAVED_PATH_HINT = "The folder you saved."
const DETECTED_PATH_HINT = "Found on this machine. Change it to install somewhere else."

const missingPathHint = (label: string): string =>
  `${label} was not found on this machine. Enter the folder it keeps its configuration in.`

const missingCliReason = (agent: AgentName): string => `${AGENT_CLI_NAMES[agent]} is not installed on this machine.`

const hasCli = (agent: AgentName, detections: readonly AgentDetection[]): boolean =>
  detections.some((detection) => detection.agent === agent && detection.hasCli)

const locationOf = (
  agent: AgentName,
  choice: AgentsChoice | null,
  detections: readonly AgentDetection[],
): AgentLocation => {
  const savedPath = choice?.installs.find((install) => install.agent === agent)?.installPath ?? null
  const detectedPath = detections.find((detection) => detection.agent === agent)?.installPath ?? null
  if (savedPath !== null) return { isPicked: hasCli(agent, detections), installPath: savedPath, pathHint: SAVED_PATH_HINT }
  return detectedPath === null
    ? { isPicked: false, installPath: "", pathHint: missingPathHint(AGENT_LABELS[agent]) }
    : { isPicked: false, installPath: detectedPath, pathHint: DETECTED_PATH_HINT }
}

const toAgentOption = (
  agent: AgentName,
  choice: AgentsChoice | null,
  detections: readonly AgentDetection[],
  agentModels: AgentModels,
): AgentOption => {
  const model = savedModelOf(choice, agent) ?? DEFAULT_MODEL
  const effort = savedEffortOf(choice, agent)
  const offers = offerModels(agent, agentModels, savedModelOf(choice, agent))
  return {
    agent,
    label: AGENT_LABELS[agent],
    ...locationOf(agent, choice, detections),
    unavailableReason: hasCli(agent, detections) ? null : missingCliReason(agent),
    model,
    effort: offeredEffortOf(offers.find((offer) => offer.model === model), effort),
    modelOptions: offers.map((offer) => toModelOption(offer, effort)),
  }
}

const defaultAgentOf = (choice: AgentsChoice | null, detections: readonly AgentDetection[]): AgentName | null =>
  choice !== null && hasCli(choice.defaultAgent, detections) ? choice.defaultAgent : null

const toTerminalAppOption = (terminalApp: TerminalApp): TerminalAppOption => ({
  terminalApp,
  label: TERMINAL_APP_LABELS[terminalApp],
})

const offeredTerminalAppsOf = (installedTerminalApps: readonly TerminalApp[]): readonly TerminalApp[] =>
  TERMINAL_APPS.filter((terminalApp) => installedTerminalApps.includes(terminalApp))

const selectedTerminalAppOf = (
  choice: AgentsChoice | null,
  offeredTerminalApps: readonly TerminalApp[],
): TerminalApp | null => {
  const preferredTerminalApps = [...(choice === null ? [] : [choice.terminalApp]), DEFAULT_TERMINAL_APP, ...offeredTerminalApps]
  return preferredTerminalApps.find((terminalApp) => offeredTerminalApps.includes(terminalApp)) ?? null
}

export const buildAgentsStep = (
  choice: AgentsChoice | null,
  detections: readonly AgentDetection[],
  agentModels: AgentModels,
  installedTerminalApps: readonly TerminalApp[],
): AgentsStep => {
  const offeredTerminalApps = offeredTerminalAppsOf(installedTerminalApps)
  return {
    step: "agents",
    agents: AGENT_NAMES.map((agent) => toAgentOption(agent, choice, detections, agentModels)),
    defaultAgent: defaultAgentOf(choice, detections),
    terminalApps: offeredTerminalApps.map(toTerminalAppOption),
    terminalApp: selectedTerminalAppOf(choice, offeredTerminalApps),
  }
}
