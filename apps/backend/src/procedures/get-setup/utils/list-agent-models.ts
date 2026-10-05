import type { AgentModels } from "./agent-models"
import type { AgentName } from "./setup"
import type { SetupEnvironment } from "./setup-environment"

export const listModelsOf = async (
  agents: readonly AgentName[],
  environment: Pick<SetupEnvironment, "listAgentModels">,
): Promise<AgentModels> => {
  const entries = await Promise.all(agents.map(async (agent) => [agent, await environment.listAgentModels(agent)] as const))
  return Object.fromEntries(entries)
}
