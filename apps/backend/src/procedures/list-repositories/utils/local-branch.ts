import type { BranchTip } from "@flightplan/git-forge"

export interface LocalBranch {
  readonly name: string
  readonly tipDate: Date
  readonly startedAt: Date
}

export const isTrackedBranch = (tip: BranchTip, trackedAuthorIds: readonly string[]): boolean =>
  trackedAuthorIds.some((authorId) => authorId.toLowerCase() === tip.authorEmail)

export const toLocalBranch = (tip: BranchTip, startedAt: string | null): LocalBranch => ({
  name: tip.name,
  tipDate: new Date(tip.updatedAt),
  startedAt: new Date(startedAt ?? tip.updatedAt),
})
