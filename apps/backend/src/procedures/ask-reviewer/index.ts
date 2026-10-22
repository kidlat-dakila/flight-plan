import type { ProcedureContext } from "@/procedures/context"
import { listenCommandOf, listenInstructionOf } from "@/procedures/get-conversation/utils/agent-text"
import {
  appendAndPublish,
  findReviewTarget,
  markAgentSeen,
} from "@/procedures/get-conversation/utils/conversation-actions"
import { planQuestionBatch } from "./utils/plan-question-batch"
import type { AskReviewerInput, ReviewerAsking } from "./utils/schemas"

const askedNote = (batchId: string, nextStep: string): string =>
  `The reviewer sees your questions (${batchId}) in Flight Plan. ${nextStep}`

export const askReviewer = async (input: AskReviewerInput, context: ProcedureContext): Promise<ReviewerAsking> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  const batchId = context.conversationEnvironment.newId()
  const plan = planQuestionBatch(batchId, input.questions)
  if (plan.kind === "rejected") return plan
  markAgentSeen(key, context)
  await appendAndPublish(
    key,
    [{ kind: "question-batch", id: batchId, origin: "agent", questions: plan.questions, askedAt: context.now() }],
    context,
  )
  const command = listenCommandOf(context.conversationEnvironment.serverUrl, key)
  return { kind: "asked", batchId, note: askedNote(batchId, listenInstructionOf(command)) }
}
