import type { ProcedureContext } from "@/procedures/context"
import { applyReviewedChange } from "./utils/apply-reviewed-change"
import type { SetReviewedInput } from "./utils/schemas"

export const setReviewed = async (
  input: SetReviewedInput,
  context: ProcedureContext,
): Promise<{ readonly isReviewed: boolean } | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, marks] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.readReviewedMarks(key),
  ])
  const changedMarks = artifact === null ? null : applyReviewedChange(artifact, marks, input.subject, input.isReviewed)
  if (changedMarks === null) return null
  await context.reviewStore.writeReviewedMarks(key, changedMarks)
  return { isReviewed: input.isReviewed }
}
