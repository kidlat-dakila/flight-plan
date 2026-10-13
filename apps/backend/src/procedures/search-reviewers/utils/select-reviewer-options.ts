import type { ReviewerCandidate } from "@/procedures/get-review/utils/pull-request-forge"
import type { Reviewer } from "@/procedures/get-review/utils/review-target-detail"
import { normalizeLogin } from "@/procedures/list-repositories/utils/build-review-targets"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import type { ReviewerOption } from "./schemas"

export interface ReviewerSelection {
  readonly candidates: readonly ReviewerCandidate[]
  readonly reviewers: readonly Reviewer[]
  readonly authorLogin: string
}

const HANDLE_PREFIX = "@"

const toOption = (candidate: ReviewerCandidate): ReviewerOption => ({
  login: candidate.login,
  name: candidate.name,
  detail: `${HANDLE_PREFIX}${candidate.login}`,
  avatarUrl: candidate.avatarUrl,
  monogram: monogramOf(candidate.name),
})

export const selectReviewerOptions = ({ candidates, reviewers, authorLogin }: ReviewerSelection): ReviewerOption[] => {
  const takenLogins = new Set([authorLogin, ...reviewers.flatMap((reviewer) => reviewer.login ?? [])].map(normalizeLogin))
  return candidates.filter((candidate) => !takenLogins.has(normalizeLogin(candidate.login))).map(toOption)
}
