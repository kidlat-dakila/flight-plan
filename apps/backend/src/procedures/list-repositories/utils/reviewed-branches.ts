import type { BranchTarget, Repository } from "./repository"
import { branchNameOfTargetId, targetIdOf } from "./target-id"

export interface ReviewedBranch {
  readonly name: string
  readonly requestedAt: Date
}

export const unlistedBranchNamesOf = (repository: Repository, reviewedTargetIds: readonly string[]): readonly string[] => {
  const listedTargetIds = repository.targets.map(targetIdOf)
  return reviewedTargetIds
    .filter((targetId) => !listedTargetIds.includes(targetId))
    .map(branchNameOfTargetId)
    .filter((branchName) => branchName !== null)
}

const toBranchTarget = ({ name, requestedAt }: ReviewedBranch): BranchTarget => ({
  kind: "branch",
  name,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: requestedAt,
})

export const withReviewedBranches = (repository: Repository, branches: readonly ReviewedBranch[]): Repository =>
  branches.length === 0 ? repository : { ...repository, targets: [...repository.targets, ...branches.map(toBranchTarget)] }
