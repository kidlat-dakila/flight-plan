import { closeAgent } from "@/procedures/close-agent"
import type { ProcedureContext } from "@/procedures/context"

export const closeAllAgents = (context: ProcedureContext): number =>
  context.conversationEnvironment.agents
    .list()
    .filter((agent) => closeAgent(agent.key, "shutdown", context))
    .length
