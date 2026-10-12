import type { ProcedureContext } from "@/procedures/context"
import type { DeleteReviewInput, DeleteReviewResult } from "./utils/schemas"

const DELETED_MESSAGE = "Flight Plan deleted"

export const deleteReview = async (input: DeleteReviewInput, context: ProcedureContext): Promise<DeleteReviewResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  if (await context.reviewStore.findArtifact(key) === null) return null
  await context.reviewStore.deleteScaffold(key)
  return { message: DELETED_MESSAGE }
}
