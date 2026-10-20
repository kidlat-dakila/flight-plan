import type { ProcedureContext } from "@/procedures/context"
import type { ReviewScaffold } from "@/procedures/get-review/utils/stored-review"
import type { DeclineWriteUpInput, DeclineWriteUpResult } from "./utils/schemas"

const DECLINED: DeclineWriteUpResult = { kind: "declined" }

export const withWriteUpDeclined = (scaffold: ReviewScaffold): ReviewScaffold => ({
  ...scaffold,
  request: { ...scaffold.request, isWriteUpDeclined: true },
})

export const declineWriteUp = async (input: DeclineWriteUpInput, context: ProcedureContext): Promise<DeclineWriteUpResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const scaffold = await context.reviewStore.readScaffold(key)
  if (scaffold === null) return null
  await context.reviewStore.writeScaffold(key, withWriteUpDeclined(scaffold))
  return DECLINED
}
