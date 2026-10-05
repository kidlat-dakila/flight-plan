import type { AgentSpawners } from "@/procedures/get-conversation/utils/conversation-environment"
import { AGENT_NAMES, type AgentName } from "@/procedures/get-setup/utils/setup"

export const startableAgentsOf = (spawners: AgentSpawners): readonly AgentName[] =>
  AGENT_NAMES.filter((agent) => spawners[agent] !== undefined)
