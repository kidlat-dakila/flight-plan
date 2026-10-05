import type { ProcedureContext } from "@/procedures/context"
import type { AgentClosing } from "@/procedures/get-conversation/utils/agent-registry"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export const closeAgent = (key: ReviewKey, closing: AgentClosing, context: ProcedureContext): boolean => {
  const { agents, hub } = context.conversationEnvironment
  const closed = agents.update(key, (agent) => ({ ...agent, closing: agent.closing ?? closing }))
  if (closed === null) return false
  if (closed.process === null) agents.release(key, closed.sessionId)
  else closed.process.stop()
  hub.publish(key)
  return true
}
