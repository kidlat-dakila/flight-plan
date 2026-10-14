import type { BranchTarget, PullRequestTarget, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { branchNameOfTargetId, targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import type { BranchTip, ReviewTarget as ForgeTarget } from "@flightplan/git-forge"

export interface AddableSources {
  readonly branchTips: readonly BranchTip[]
  readonly openPullRequests: readonly ForgeTarget[]
}

const toBranchTarget = (tip: BranchTip): BranchTarget => ({
  kind: "branch",
  name: tip.name,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: new Date(tip.updatedAt),
})

const toPullRequestTarget = (pullRequest: ForgeTarget, number: number, branch: string): PullRequestTarget => ({
  kind: "pull-request",
  number,
  title: pullRequest.title,
  branch,
  author: pullRequest.author,
  authorAvatarUrl: null,
  branchStatus: pullRequest.isDraft ? "draft" : "no-review",
  isNew: false,
  updatedAt: new Date(pullRequest.updatedAt),
})

const pullRequestFrom = (branchName: string, openPullRequests: readonly ForgeTarget[]): PullRequestTarget | null => {
  const pullRequest = openPullRequests.find((candidate) => candidate.headBranch === branchName)
  return pullRequest?.ref.kind === "pr" ? toPullRequestTarget(pullRequest, pullRequest.ref.number, branchName) : null
}

const toAddableTarget = (tip: BranchTip, openPullRequests: readonly ForgeTarget[]): ReviewTarget =>
  pullRequestFrom(tip.name, openPullRequests) ?? toBranchTarget(tip)

const isFirstOfItsId = (target: ReviewTarget, position: number, targets: readonly ReviewTarget[]): boolean =>
  targets.findIndex((other) => targetIdOf(other) === targetIdOf(target)) === position

const byLatestUpdate = (first: ReviewTarget, second: ReviewTarget): number =>
  second.updatedAt.getTime() - first.updatedAt.getTime()

export const selectAddableTargets = ({ branchTips, openPullRequests }: AddableSources): readonly ReviewTarget[] =>
  branchTips
    .map((tip) => toAddableTarget(tip, openPullRequests))
    .filter(isFirstOfItsId)
    .sort(byLatestUpdate)

const isFromBranch = (target: ReviewTarget, branchName: string | null): boolean =>
  target.kind === "pull-request" && target.branch === branchName

export const findAddableTarget = (targets: readonly ReviewTarget[], targetId: string): ReviewTarget | null => {
  const branchName = branchNameOfTargetId(targetId)
  return targets.find((target) => targetIdOf(target) === targetId)
    ?? targets.find((target) => isFromBranch(target, branchName))
    ?? null
}
