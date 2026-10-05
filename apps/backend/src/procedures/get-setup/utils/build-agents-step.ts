import { AGENT_CLI_NAMES, AGENT_LABELS, AGENT_MODELS, CONNECTION_OFFERS } from "./agent-catalog"
import type { AgentsStep } from "./schemas"
import {
  AGENT_CONNECTIONS,
  AGENT_NAMES,
  DEFAULT_MODEL,
  type AgentConnection,
  type AgentName,
  type AgentsChoice,
} from "./setup"
import type { AgentDetection } from "./setup-environment"

type AgentOption = AgentsStep["agents"][number]

type AgentLocation = Pick<AgentOption, "isPicked" | "installPath" | "pathHint">

const DEFAULT_CONNECTION: AgentConnection = "direct"
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
): AgentOption => ({
  agent,
  label: AGENT_LABELS[agent],
  ...locationOf(agent, choice, detections),
  unavailableReason: hasCli(agent, detections) ? null : missingCliReason(agent),
  model: choice?.installs.find((install) => install.agent === agent)?.model ?? DEFAULT_MODEL,
  modelOptions: AGENT_MODELS[agent].map(({ model, label }) => ({ model, label })),
})

const defaultAgentOf = (choice: AgentsChoice | null, detections: readonly AgentDetection[]): AgentName | null =>
  choice !== null && hasCli(choice.defaultAgent, detections) ? choice.defaultAgent : null

const toConnectionOption = (connection: AgentConnection): AgentsStep["connectionOptions"][number] => ({
  connection,
  label: CONNECTION_OFFERS[connection].label,
  tagLabel: CONNECTION_OFFERS[connection].tagLabel,
  description: CONNECTION_OFFERS[connection].description,
  unavailableFeatures: [...CONNECTION_OFFERS[connection].unavailableFeatures],
})

export const buildAgentsStep = (choice: AgentsChoice | null, detections: readonly AgentDetection[]): AgentsStep => ({
  step: "agents",
  agents: AGENT_NAMES.map((agent) => toAgentOption(agent, choice, detections)),
  defaultAgent: defaultAgentOf(choice, detections),
  connection: choice?.connection ?? DEFAULT_CONNECTION,
  connectionOptions: AGENT_CONNECTIONS.map(toConnectionOption),
})
