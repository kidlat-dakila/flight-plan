import type { ProcedureContext } from "@/procedures/context"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { isAgentOnline, isNewAgentSession } from "./agent-presence"
import type { ConversationEvent, JournalEntry } from "./conversation"
import { lookUpReviewTarget, type ReviewTargetLookup } from "./review-target"
import { isReviewerIdle } from "./reviewer-activity"

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

export const isAgentOnlineFor = (key: ReviewKey, context: ProcedureContext): boolean =>
  isAgentOnline(context.conversationEnvironment.presence.presenceOf(key), context.now())

export const markReviewerActive = (key: ReviewKey, context: ProcedureContext): void => {
  context.conversationEnvironment.reviewerActivity.markActive(key, context.now())
}

export const isReviewerIdleFor = (key: ReviewKey, context: ProcedureContext): boolean => {
  const { reviewerActivity, idleLimitMs } = context.conversationEnvironment
  return isReviewerIdle(reviewerActivity.activityOf(key), idleLimitMs, context.now())
}

export const restartIdleClockForNewSession = (key: ReviewKey, context: ProcedureContext): void => {
  if (isNewAgentSession(context.conversationEnvironment.presence.presenceOf(key), context.now())) markReviewerActive(key, context)
}

export const markAgentSeen = (key: ReviewKey, context: ProcedureContext): void => {
  const wasOnline = isAgentOnlineFor(key, context)
  restartIdleClockForNewSession(key, context)
  context.conversationEnvironment.presence.markSeen(key, context.now())
  if (!wasOnline) context.conversationEnvironment.hub.publish(key)
}
