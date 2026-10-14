import type { ProcedureContext } from "@/procedures/context"
import { appendAndPublish } from "@/procedures/get-conversation/utils/conversation-actions"
import { readChatWriter } from "@/procedures/get-model-choice/utils/chat-writer"
import { planModelChoice } from "./utils/plan-model-choice"
import type { ChooseModelInput, ModelChoosing } from "./utils/schemas"

export const chooseModel = async (input: ChooseModelInput, context: ProcedureContext): Promise<ModelChoosing> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const plan = planModelChoice(await readChatWriter(key, context), input.model)
  if (plan.kind === "rejected") return plan
  await appendAndPublish(
    key,
    [
      {
        kind: "model-choice",
        id: context.conversationEnvironment.newId(),
        agent: plan.agent,
        model: plan.model,
        effort: plan.effort,
        chosenAt: context.now(),
      },
    ],
    context,
  )
  return { kind: "chosen" }
}
