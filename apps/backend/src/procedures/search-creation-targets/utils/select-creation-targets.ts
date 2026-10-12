import { normalizeLogin } from "@/procedures/list-repositories/utils/build-review-targets"
import type {
  BranchStatus,
  BranchTarget,
  PullRequestTarget,
  ReviewTarget,
} from "@/procedures/list-repositories/utils/repository"
import type { BranchTip } from "@flightplan/git-forge"

export interface TargetSearch {
  readonly targets: readonly ReviewTarget[]
  readonly branchTips: readonly BranchTip[]
  readonly viewerLogin: string | null
  readonly query: string
}

const PULL_REQUEST_LIMIT = 8
const BRANCH_LIMIT = 2
const FINISHED_STATUSES: readonly BranchStatus[] = ["closed", "merged"]
const WHITESPACE_PATTERN = /\s+/

const isOpenPullRequest = (target: ReviewTarget): target is PullRequestTarget =>
  target.kind === "pull-request" && !FINISHED_STATUSES.includes(target.branchStatus)

const searchTextOf = (target: ReviewTarget): string =>
  (target.kind === "pull-request" ? `${target.title} #${String(target.number)} ${target.branch}` : target.name).toLowerCase()

const termsOf = (query: string): readonly string[] =>
  query.toLowerCase().split(WHITESPACE_PATTERN).filter((term) => term !== "")

const matchesEvery = (terms: readonly string[]) => (target: ReviewTarget): boolean => {
  const searchText = searchTextOf(target)
  return terms.every((term) => searchText.includes(term))
}

const byLatestUpdate = (first: ReviewTarget, second: ReviewTarget): number =>
  second.updatedAt.getTime() - first.updatedAt.getTime()

const ownFirst = (viewerLogin: string | null) => (first: PullRequestTarget, second: PullRequestTarget): number => {
  const ownLogin = viewerLogin === null ? null : normalizeLogin(viewerLogin)
  const isOwn = (target: PullRequestTarget): number => Number(normalizeLogin(target.author) === ownLogin)
  return isOwn(second) - isOwn(first) || byLatestUpdate(first, second)
}

const toBranchTarget = (tip: BranchTip): BranchTarget => ({
  kind: "branch",
  name: tip.name,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: new Date(tip.updatedAt),
})

export const selectCreationTargets = ({ targets, branchTips, viewerLogin, query }: TargetSearch): readonly ReviewTarget[] => {
  const matches = matchesEvery(termsOf(query))
  const openPullRequests = targets.filter(isOpenPullRequest)
  const pullRequestBranches = openPullRequests.map((pullRequest) => pullRequest.branch)
  const pullRequests = openPullRequests
    .filter(matches)
    .sort(ownFirst(viewerLogin))
    .slice(0, PULL_REQUEST_LIMIT)
  const branches = branchTips
    .filter((tip) => !pullRequestBranches.includes(tip.name))
    .map(toBranchTarget)
    .filter(matches)
    .sort(byLatestUpdate)
    .slice(0, BRANCH_LIMIT)
  return [...pullRequests, ...branches]
}
