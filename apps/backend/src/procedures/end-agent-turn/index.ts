import type { ProcedureContext } from "@/procedures/context"
import { formatInbound, REPLY_REMINDER } from "@/procedures/get-conversation/utils/agent-text"
import { lastSequenceOf, type ConversationEvent } from "@/procedures/get-conversation/utils/conversation"
import { appendAndPublish, confirmAgentStart } from "@/procedures/get-conversation/utils/conversation-actions"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { planTurnEnding } from "./utils/plan-turn-ending"

export interface AgentTurnInput {
  readonly sessionId: string
  readonly lastAssistantMessage: string | null
}

export type TurnEnding
  = | { readonly kind: "continue", readonly reason: string }
    | { readonly kind: "close", readonly key: ReviewKey }
    | { readonly kind: "unknown-session" }

const replyEvents = (unsentReply: string | null, id: string, now: Date): readonly ConversationEvent[] =>
  unsentReply === null ? [] : [{ kind: "agent-message", id, body: unsentReply, sentAt: now }]

export const endAgentTurn = async (input: AgentTurnInput, context: ProcedureContext): Promise<TurnEnding> => {
  const { agents, store, newId } = context.conversationEnvironment
  const agent = await confirmAgentStart(input.sessionId, context)
  if (agent === null) return { kind: "unknown-session" }
  const now = context.now()
  const { journal } = await store.read(agent.key)
  const plan = planTurnEnding({ journal, wasReminded: agent.wasReminded, lastAssistantMessage: input.lastAssistantMessage })
  if (plan.kind === "remind") {
    agents.update(agent.key, (current) => ({ ...current, wasReminded: true }))
    return { kind: "continue", reason: REPLY_REMINDER }
  }
  if (plan.kind === "deliver") {
    agents.update(agent.key, (current) => ({ ...current, wasReminded: false }))
    const delivery: ConversationEvent = {
      kind: "delivery",
      id: newId(),
      throughSequence: lastSequenceOf(plan.pending),
      channel: "turn-end",
      deliveredAt: now,
    }
    await appendAndPublish(agent.key, [...replyEvents(plan.unsentReply, newId(), now), delivery], context)
    return { kind: "continue", reason: formatInbound(plan.pending, journal) }
  }
  agents.update(agent.key, (current) => ({ ...current, closing: current.closing ?? "turn-ended" }))
  await appendAndPublish(agent.key, replyEvents(plan.unsentReply, newId(), now), context)
  return { kind: "close", key: agent.key }
}
