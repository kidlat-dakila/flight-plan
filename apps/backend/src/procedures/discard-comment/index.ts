import type { ProcedureContext } from "@/procedures/context"
import type { DiscardCommentInput } from "./utils/schemas"

export const discardComment = async (input: DiscardCommentInput, context: ProcedureContext): Promise<boolean> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const pendingComments = await context.reviewStore.readPendingComments(key)
  const kept = pendingComments.filter((pending) => pending.id !== input.commentId)
  if (kept.length === pendingComments.length) return false
  await context.reviewStore.writePendingComments(key, kept)
  return true
}
