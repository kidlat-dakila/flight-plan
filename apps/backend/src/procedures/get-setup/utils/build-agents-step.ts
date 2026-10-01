import { AGENT_LABELS, CONNECTION_OFFERS } from "./agent-catalog"
import type { AgentsStep } from "./schemas"
import { AGENT_CONNECTIONS, AGENT_NAMES, type AgentConnection, type AgentName, type AgentsChoice } from "./setup"
import type { AgentDetection } from "./setup-environment"

type AgentOption = AgentsStep["agents"][number]

const DEFAULT_CONNECTION: AgentConnection = "direct"
const SAVED_PATH_HINT = "The folder you saved."
const DETECTED_PATH_HINT = "Found on this machine. Change it to install somewhere else."

const missingPathHint = (label: string): string =>
  `${label} was not found on this machine. Enter the folder it keeps its configuration in.`

const toAgentOption = (
  agent: AgentName,
  choice: AgentsChoice | null,
  detections: readonly AgentDetection[],
): AgentOption => {
  const label = AGENT_LABELS[agent]
  const savedPath = choice?.installs.find((install) => install.agent === agent)?.installPath ?? null
  const detectedPath = detections.find((detection) => detection.agent === agent)?.installPath ?? null
  if (savedPath !== null) return { agent, label, isPicked: true, installPath: savedPath, pathHint: SAVED_PATH_HINT }
  return detectedPath === null
    ? { agent, label, isPicked: false, installPath: "", pathHint: missingPathHint(label) }
    : { agent, label, isPicked: false, installPath: detectedPath, pathHint: DETECTED_PATH_HINT }
}

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
  defaultAgent: choice?.defaultAgent ?? null,
  connection: choice?.connection ?? DEFAULT_CONNECTION,
  connectionOptions: AGENT_CONNECTIONS.map(toConnectionOption),
})
