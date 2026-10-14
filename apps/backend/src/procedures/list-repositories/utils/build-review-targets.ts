import { deriveBranchStatus } from "./derive-branch-status"
import type { ForgePullRequest, ForgeSnapshot } from "./forge-pull-request"
import type { LocalBranch } from "./local-branch"
import type { BranchStatus, BranchTarget, PullRequestTarget } from "./repository"
import { pullRequestTargetIdOf, targetIdOf } from "./target-id"
import { isAddedTarget, isNewTarget, type TargetMemory } from "./target-memory"
import { isNobodyTracked } from "./tracked-authors"

const AUTHOR_HANDLE_PREFIX = "@"
const LOCAL_BRANCH_STATUS: BranchStatus = "no-review"

export const normalizeLogin = (login: string): string => login.replace(AUTHOR_HANDLE_PREFIX, "").toLowerCase()

const isTrackedPullRequest = (pullRequest: ForgePullRequest, trackedLogins: readonly string[]): boolean =>
  trackedLogins.includes(normalizeLogin(pullRequest.author.login))

const isListedPullRequest = (pullRequest: ForgePullRequest, trackedLogins: readonly string[], memory: TargetMemory): boolean =>
  isTrackedPullRequest(pullRequest, trackedLogins) || isAddedTarget(memory, pullRequestTargetIdOf(pullRequest.number))

const toPullRequestTarget = (
  pullRequest: ForgePullRequest,
  viewerLogin: string,
  memory: TargetMemory,
): PullRequestTarget => {
  const branchStatus = deriveBranchStatus(pullRequest, viewerLogin)
  const target: PullRequestTarget = {
    kind: "pull-request",
    number: pullRequest.number,
    title: pullRequest.title,
    branch: pullRequest.headBranch,
    author: pullRequest.author.login,
    authorAvatarUrl: pullRequest.author.avatarUrl,
    branchStatus,
    isNew: false,
    updatedAt: pullRequest.updatedAt,
  }
  return {
    ...target,
    isNew: isNewTarget(memory, { targetId: targetIdOf(target), startedAt: pullRequest.createdAt, branchStatus }),
  }
}

export const toPullRequestTargets = (
  snapshot: ForgeSnapshot,
  trackedAuthorIds: readonly string[],
  memory: TargetMemory,
): readonly PullRequestTarget[] => {
  const trackedLogins = [...trackedAuthorIds, snapshot.viewerLogin].map(normalizeLogin)
  return snapshot.pullRequests
    .filter((pullRequest) => isNobodyTracked(trackedAuthorIds) || isListedPullRequest(pullRequest, trackedLogins, memory))
    .map((pullRequest) => toPullRequestTarget(pullRequest, snapshot.viewerLogin, memory))
}

const toBranchTarget = (branch: LocalBranch, memory: TargetMemory): BranchTarget => {
  const target: BranchTarget = {
    kind: "branch",
    name: branch.name,
    branchStatus: LOCAL_BRANCH_STATUS,
    isNew: false,
    updatedAt: branch.tipDate,
  }
  return {
    ...target,
    isNew: isNewTarget(memory, { targetId: targetIdOf(target), startedAt: branch.startedAt, branchStatus: target.branchStatus }),
  }
}

export const toBranchTargets = (branches: readonly LocalBranch[], memory: TargetMemory): readonly BranchTarget[] =>
  branches.map((branch) => toBranchTarget(branch, memory))
