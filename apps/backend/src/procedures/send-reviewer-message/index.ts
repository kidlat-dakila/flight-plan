import type { ProcedureContext } from "@/procedures/context"
import { deliverToAgent } from "@/procedures/deliver-to-agent"
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
    [{ kind: "reviewer-message", id: messageId, body: input.body, reference: input.reference, sentAt: context.now() }],
    context,
  )
  await deliverToAgent(key, context)
  return { kind: "sent", messageId }
}
