import type { Repository, ReviewTarget } from "@/repository/repository"
import { targetIdOf } from "@/repository/target-id"

const withoutNewMark = (target: ReviewTarget, targetId: string): ReviewTarget =>
  targetIdOf(target) === targetId ? { ...target, isNew: false } : target

export const dismissNewTarget = (
  repositories: readonly Repository[],
  repositoryName: string,
  targetId: string,
): Repository | null => {
  const repository = repositories.find((candidate) => candidate.name === repositoryName)
  if (repository === undefined) return null
  if (!repository.targets.some((target) => targetIdOf(target) === targetId)) return null
  return { ...repository, targets: repository.targets.map((target) => withoutNewMark(target, targetId)) }
}
