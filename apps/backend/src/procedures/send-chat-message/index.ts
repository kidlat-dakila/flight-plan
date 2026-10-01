import type { ProcedureContext } from "@/procedures/context"
import type { SendChatMessageInput } from "./utils/schemas"

export const sendChatMessage = async (
  input: SendChatMessageInput,
  context: ProcedureContext,
): Promise<{ readonly messageId: string }> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const questions = await context.reviewStore.readChatQuestions(key)
  const messageId = `question-${String(questions.length + 1)}`
  await context.reviewStore.writeChatQuestions(key, [
    ...questions,
    { id: messageId, body: input.body, reference: input.reference, sentAt: context.now() },
  ])
  return { messageId }
}
