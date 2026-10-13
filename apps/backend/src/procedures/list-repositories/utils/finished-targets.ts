import type { Publication } from "@/procedures/get-review/utils/discussion"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { Repository } from "./repository"
import { targetIdOf } from "./target-id"

const COMPLETE_STATUS = "complete"

export const newTargetIdsOf = (repository: Repository): readonly string[] =>
  repository.targets.filter((target) => target.isNew).map(targetIdOf)

export const isFinishedFlightPlan = (artifact: ReviewArtifact | null, publications: readonly Publication[]): boolean =>
  artifact?.status === COMPLETE_STATUS && publications.length > 0

export const withoutFinishedPrompts = (repository: Repository, finishedTargetIds: readonly string[]): Repository =>
  finishedTargetIds.length === 0
    ? repository
    : {
        ...repository,
        targets: repository.targets.map((target) =>
          (finishedTargetIds.includes(targetIdOf(target)) ? { ...target, isNew: false } : target)),
      }
