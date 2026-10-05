import type { ProcedureContext } from "@/procedures/context"
import { deliverToAgent } from "@/procedures/deliver-to-agent"
import { findQuestionBatch, isBatchSettled } from "@/procedures/get-conversation/utils/conversation"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { planAnswers } from "./utils/plan-answers"
import type { AnswerQuestionsInput, Answering } from "./utils/schemas"

export const answerQuestions = async (input: AnswerQuestionsInput, context: ProcedureContext): Promise<Answering> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const { journal } = await context.conversationEnvironment.store.read(key)
  const batchState = { batch: findQuestionBatch(journal, input.batchId), isSettled: isBatchSettled(journal, input.batchId) }
  const plan = planAnswers(batchState, input.answers)
  if (plan.kind === "rejected") return plan
  const { batch } = plan
  await appendAndPublish(
    key,
    [
      {
        kind: "answers",
        id: context.conversationEnvironment.newId(),
        batchId: batch.id,
        origin: batch.origin,
        answers: plan.answers,
        answeredAt: context.now(),
      },
    ],
    context,
  )
  if (batch.origin === "agent") await deliverToAgent(key, context)
  return { kind: "accepted" }
}
