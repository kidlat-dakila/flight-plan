import type { BranchTarget, Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { branchNameOfTargetId, targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import type { ChangeReader } from "./change-reader"

export interface TargetLookup {
  readonly changeReader: Pick<ChangeReader, "findRevision">
  readonly now: () => Date
}

const toUnlistedBranchTarget = (name: string, foundAt: Date): BranchTarget => ({
  kind: "branch",
  name,
  branchStatus: "no-review",
  isNew: false,
  updatedAt: foundAt,
})

const findUnlistedBranchTarget = async (
  repository: Repository,
  targetId: string,
  { changeReader, now }: TargetLookup,
): Promise<BranchTarget | null> => {
  const branchName = branchNameOfTargetId(targetId)
  if (branchName === null) return null
  const revision = await changeReader.findRevision(repository.path, branchName)
  return revision === null ? null : toUnlistedBranchTarget(branchName, now())
}

export const findReviewTarget = async (
  repository: Repository,
  targetId: string,
  lookup: TargetLookup,
): Promise<ReviewTarget | null> =>
  repository.targets.find((candidate) => targetIdOf(candidate) === targetId)
  ?? await findUnlistedBranchTarget(repository, targetId, lookup)
