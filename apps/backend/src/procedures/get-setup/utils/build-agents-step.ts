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
import { AGENT_NAMES, DEFAULT_MODEL, type AgentName, type AgentsChoice } from "./setup"
import type { AgentDetection } from "./setup-environment"

type AgentOption = AgentsStep["agents"][number]

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

export const buildAgentsStep = (
  choice: AgentsChoice | null,
  detections: readonly AgentDetection[],
  agentModels: AgentModels,
): AgentsStep => ({
  step: "agents",
  agents: AGENT_NAMES.map((agent) => toAgentOption(agent, choice, detections, agentModels)),
  defaultAgent: defaultAgentOf(choice, detections),
})
