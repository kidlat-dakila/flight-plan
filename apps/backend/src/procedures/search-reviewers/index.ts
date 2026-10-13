import type { ProcedureContext } from "@/procedures/context"
import { findPullRequestSubject } from "@/procedures/get-review"
import type { ReviewerOption, SearchReviewersInput } from "./utils/schemas"
import { selectReviewerOptions } from "./utils/select-reviewer-options"

export const searchReviewers = async (input: SearchReviewersInput, context: ProcedureContext): Promise<ReviewerOption[] | null> => {
  const subject = await findPullRequestSubject({ repositoryName: input.repositoryName, targetId: input.targetId }, context)
  if (subject === null) return null
  const candidates = await context.pullRequestForge.searchReviewers(subject.repository, subject.target.number, input.query)
  return selectReviewerOptions({
    candidates,
    reviewers: subject.detail?.reviewers ?? [],
    authorLogin: subject.target.author,
  })
}
