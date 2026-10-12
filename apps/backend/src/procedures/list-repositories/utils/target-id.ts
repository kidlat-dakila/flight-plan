import type { ReviewTarget } from "./repository"

const BRANCH_ID_PREFIX = "branch-"

export const branchTargetIdOf = (branchName: string): string => `${BRANCH_ID_PREFIX}${branchName}`

export const targetIdOf = (target: ReviewTarget): string =>
  target.kind === "pull-request" ? `pr-${String(target.number)}` : branchTargetIdOf(target.name)

export const branchNameOfTargetId = (targetId: string): string | null => {
  const branchName = targetId.startsWith(BRANCH_ID_PREFIX) ? targetId.slice(BRANCH_ID_PREFIX.length) : ""
  return branchName === "" ? null : branchName
}
