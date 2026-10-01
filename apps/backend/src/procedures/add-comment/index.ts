import type { ProcedureContext } from "@/procedures/context"
import { appendComment } from "./utils/append-comment"
import type { AddCommentInput } from "./utils/schemas"

export const addComment = async (
  input: AddCommentInput,
  context: ProcedureContext,
): Promise<{ readonly threadId: string } | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [detail, discussion] = await Promise.all([
    context.reviewStore.findTargetDetail(key),
    context.reviewStore.readDiscussion(key),
  ])
  const appended = detail === null ? null : appendComment(discussion, input, context.now())
  if (appended === null) return null
  await context.reviewStore.writeDiscussion(key, appended.discussion)
  return { threadId: appended.threadId }
}
