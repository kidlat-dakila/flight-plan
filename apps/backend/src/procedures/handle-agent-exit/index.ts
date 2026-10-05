import type { ProcedureContext } from "@/procedures/context"
import { unexpectedExitReason } from "@/procedures/deliver-to-agent/utils/agent-problems"
import { shouldRedeliverAfter } from "@/procedures/get-conversation/utils/agent-registry"
import { recordAgentFailure } from "@/procedures/get-conversation/utils/conversation-actions"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"

export interface AgentExitInput {
  readonly key: ReviewKey
  readonly sessionId: string
  readonly exitCode: number
}

export interface AgentExitOutcome {
  readonly shouldRedeliver: boolean
}

export const handleAgentExit = async (input: AgentExitInput, context: ProcedureContext): Promise<AgentExitOutcome> => {
  const { agents, hub } = context.conversationEnvironment
  const released = agents.release(input.key, input.sessionId)
  if (released === null) return { shouldRedeliver: false }
  if (released.closing !== null) {
    hub.publish(input.key)
    return { shouldRedeliver: shouldRedeliverAfter(released.closing) }
  }
  const output = released.process?.readOutput() ?? ""
  await recordAgentFailure(input.key, unexpectedExitReason(released.agent, input.exitCode, output), context)
  return { shouldRedeliver: false }
}
