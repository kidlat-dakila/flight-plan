import type { ReviewTarget } from "./repository"

const BRANCH_ID_PREFIX = "branch-"
const PULL_REQUEST_ID_PREFIX = "pr-"
const PULL_REQUEST_NUMBER_PATTERN = /^[1-9]\d*$/

export const branchTargetIdOf = (branchName: string): string => `${BRANCH_ID_PREFIX}${branchName}`

export const pullRequestTargetIdOf = (number: number): string => `${PULL_REQUEST_ID_PREFIX}${String(number)}`

export const targetIdOf = (target: ReviewTarget): string =>
  target.kind === "pull-request" ? pullRequestTargetIdOf(target.number) : branchTargetIdOf(target.name)

export const branchNameOfTargetId = (targetId: string): string | null => {
  const branchName = targetId.startsWith(BRANCH_ID_PREFIX) ? targetId.slice(BRANCH_ID_PREFIX.length) : ""
  return branchName === "" ? null : branchName
}

export const pullRequestNumberOfTargetId = (targetId: string): number | null => {
  const digits = targetId.startsWith(PULL_REQUEST_ID_PREFIX) ? targetId.slice(PULL_REQUEST_ID_PREFIX.length) : ""
  return PULL_REQUEST_NUMBER_PATTERN.test(digits) ? Number(digits) : null
}
