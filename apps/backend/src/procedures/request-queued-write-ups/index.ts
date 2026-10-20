import type { ProcedureContext } from "@/procedures/context"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { findReviewTarget } from "@/procedures/get-review/utils/find-review-target"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { buildWriteUpRequestPrompt } from "@/procedures/get-review/utils/start/review-prompt"
import { planQueuedWriteUps, queuedAmendmentOf, queuedAskOf } from "./utils/plan-queued-write-ups"

export const requestQueuedWriteUps = async (key: ReviewKey, context: ProcedureContext): Promise<boolean> => {
  const { agents, writeUpQueue, newId } = context.conversationEnvironment
  if (agents.find(key) !== null) return false
  const targets = writeUpQueue.take(key)
  if (targets.length === 0) return false
  const repository = (await context.repositoryStore.list()).find((candidate) => candidate.name === key.repositoryName)
  const target = repository === undefined ? null : await findReviewTarget(repository, key.targetId, context)
  if (repository === undefined || target === null) return false
  const asks = await context.reviewStore.amendArtifact(key, (artifact) => queuedAmendmentOf(planQueuedWriteUps(artifact, targets)))
  if (asks === null || asks.length === 0) return false
  const body = buildWriteUpRequestPrompt(repository, target, key, queuedAskOf(asks))
  await appendAndPublish(key, [{ kind: "reviewer-message", id: newId(), body, reference: null, sentAt: context.now() }], context)
  return true
}
