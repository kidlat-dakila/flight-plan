import type { ProcedureContext } from "@/procedures/context"
import { appendAndPublish, findReviewTarget } from "@/procedures/get-conversation/utils/conversation-actions"
import type { ReviewerMessageSending, SendReviewerMessageInput } from "./utils/schemas"

export const sendReviewerMessage = async (
  input: SendReviewerMessageInput,
  context: ProcedureContext,
): Promise<ReviewerMessageSending> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  const messageId = context.conversationEnvironment.newId()
  await appendAndPublish(
    key,
    [{
      kind: "reviewer-message",
      id: messageId,
      body: input.body,
      reference: input.reference,
      excerpt: input.excerpt,
      sentAt: context.now(),
    }],
    context,
  )
  return { kind: "sent", messageId }
}
