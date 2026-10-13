import type { ProcedureContext } from "@/procedures/context"
import { findPullRequestSubject } from "@/procedures/get-review"
import { toActionResult, type ReviewActionResult } from "@/procedures/get-review/utils/review-action"
import type { ReviewerLoginInput } from "./utils/schemas"

export const requestReviewer = async (input: ReviewerLoginInput, context: ProcedureContext): Promise<ReviewActionResult | null> => {
  const subject = await findPullRequestSubject({ repositoryName: input.repositoryName, targetId: input.targetId }, context)
  if (subject === null) return null
  const outcome = await context.pullRequestForge.requestReviewer(subject.repository, subject.target.number, input.login)
  await context.repositoryStore.refresh(subject.repository.name)
  return toActionResult(outcome)
}
