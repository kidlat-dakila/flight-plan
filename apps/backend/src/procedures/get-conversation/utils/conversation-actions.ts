import type { ProcedureContext } from "@/procedures/context"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { RunningAgent } from "./agent-registry"
import type { ConversationEvent, JournalEntry } from "./conversation"
import { lookUpReviewTarget, type ReviewTargetLookup } from "./review-target"

export const appendAndPublish = async (
  key: ReviewKey,
  events: readonly ConversationEvent[],
  context: ProcedureContext,
): Promise<readonly JournalEntry[]> => {
  const entries = await context.conversationEnvironment.store.append(key, events)
  context.conversationEnvironment.hub.publish(key)
  return entries
}

export const findReviewTarget = async (key: ReviewKey, context: ProcedureContext): Promise<ReviewTargetLookup> =>
  lookUpReviewTarget(key, await context.repositoryStore.listRegistered())

export const markAgentActivity = (key: ReviewKey, context: ProcedureContext): void => {
  const now = context.now()
  context.conversationEnvironment.agents.update(key, (agent) => ({ ...agent, lastActivityAt: now }))
}

export const recordAgentFailure = async (key: ReviewKey, reason: string, context: ProcedureContext): Promise<void> => {
  await appendAndPublish(
    key,
    [{ kind: "agent-failure", id: context.conversationEnvironment.newId(), reason, failedAt: context.now() }],
    context,
  )
}

export const confirmAgentStart = async (sessionId: string, context: ProcedureContext): Promise<RunningAgent | null> => {
  const { agents, store, hub } = context.conversationEnvironment
  const agent = agents.findBySessionId(sessionId)
  if (agent === null) return null
  const now = context.now()
  const confirmed = agents.update(agent.key, (current) => ({ ...current, phase: "running", lastActivityAt: now }))
  if (agent.phase === "starting") {
    const conversation = await store.read(agent.key)
    if (conversation.sessionId !== sessionId) await store.saveSessionId(agent.key, sessionId)
    hub.publish(agent.key)
  }
  return confirmed
}
