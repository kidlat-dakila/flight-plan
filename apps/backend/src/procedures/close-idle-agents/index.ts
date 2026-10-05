import { closeAgent } from "@/procedures/close-agent"
import type { ProcedureContext } from "@/procedures/context"
import { startTimeoutReason } from "@/procedures/deliver-to-agent/utils/agent-problems"
import { recordAgentFailure } from "@/procedures/get-conversation/utils/conversation-actions"
import { AGENT_START_TIMEOUT_MS, findStaleAgents, type StaleAgent } from "./utils/find-stale-agents"

const closeStaleAgent = async ({ agent, reason }: StaleAgent, context: ProcedureContext): Promise<void> => {
  if (reason === "start-timeout") {
    const output = agent.process?.readOutput() ?? ""
    await recordAgentFailure(agent.key, startTimeoutReason(agent.agent, AGENT_START_TIMEOUT_MS, output), context)
  }
  closeAgent(agent.key, reason, context)
}

export const closeIdleAgents = async (context: ProcedureContext): Promise<number> => {
  const stale = findStaleAgents(context.conversationEnvironment.agents.list(), context.now())
  await Promise.all(stale.map(async (staleAgent) => {
    await closeStaleAgent(staleAgent, context)
  }))
  return stale.length
}
