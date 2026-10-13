import { installedAgentsOf, type AgentModels } from "./agent-models"
import type { AgentName, AgentsChoice } from "./setup"
import type { AgentDetection, SetupEnvironment } from "./setup-environment"

type ModelLister = Pick<SetupEnvironment, "listAgentModels">

export const listModelsOf = async (agents: readonly AgentName[], environment: ModelLister): Promise<AgentModels> => {
  const entries = await Promise.all(agents.map(async (agent) => [agent, await environment.listAgentModels(agent)] as const))
  return Object.fromEntries(entries)
}

const agentsWithCli = (detections: readonly AgentDetection[]): readonly AgentName[] =>
  detections.filter((detection) => detection.hasCli).map((detection) => detection.agent)

export const listOfferedModels = async (
  detections: readonly AgentDetection[],
  choice: AgentsChoice | null,
  environment: ModelLister,
): Promise<AgentModels> =>
  await listModelsOf([...new Set([...agentsWithCli(detections), ...installedAgentsOf(choice)])], environment)
