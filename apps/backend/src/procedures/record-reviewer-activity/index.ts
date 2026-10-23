import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget, markReviewerActive } from "@/procedures/get-conversation/utils/conversation-actions"
import type { RecordReviewerActivityInput, ReviewerActivityRecording } from "./utils/schemas"

export const recordReviewerActivity = async (
  input: RecordReviewerActivityInput,
  context: ProcedureContext,
): Promise<ReviewerActivityRecording> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  markReviewerActive(key, context)
  return { kind: "recorded" }
}
