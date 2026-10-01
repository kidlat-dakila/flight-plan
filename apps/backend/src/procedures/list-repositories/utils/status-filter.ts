import type { BranchStatus, Repository, ReviewTarget } from "@/repository/repository"
import { BRANCH_STATUSES, type StatusFilter } from "./schemas"

export const STATUS_LABELS: Record<BranchStatus, string> = {
  "no-review": "No review",
  "awaiting-review": "Awaiting review",
  "awaiting-reply": "Awaiting reply",
  "stale": "Stale",
  "draft": "Draft",
  "closed": "Closed",
  "merged": "Merged",
}

export const DEFAULT_STATUSES: readonly BranchStatus[] = ["no-review", "awaiting-review", "awaiting-reply", "stale"]

const knownStatuses = (requestedStatuses: readonly string[]): BranchStatus[] =>
  BRANCH_STATUSES.filter((status) => requestedStatuses.includes(status))

export const selectStatuses = (requestedStatuses: readonly string[] | null): readonly BranchStatus[] =>
  requestedStatuses === null ? DEFAULT_STATUSES : knownStatuses(requestedStatuses)

export const matchingTargets = (
  repository: Repository,
  selectedStatuses: readonly BranchStatus[],
): readonly ReviewTarget[] => repository.targets.filter((target) => selectedStatuses.includes(target.branchStatus))

const toggledStatuses = (selectedStatuses: readonly BranchStatus[], toggled: BranchStatus): BranchStatus[] =>
  selectedStatuses.includes(toggled)
    ? selectedStatuses.filter((status) => status !== toggled)
    : BRANCH_STATUSES.filter((status) => status === toggled || selectedStatuses.includes(status))

const targetCount = (repositories: readonly Repository[], status: BranchStatus): number =>
  repositories.reduce((total, repository) => total + matchingTargets(repository, [status]).length, 0)

const isDefaultSelection = (selectedStatuses: readonly BranchStatus[]): boolean =>
  BRANCH_STATUSES.every((status) => selectedStatuses.includes(status) === DEFAULT_STATUSES.includes(status))

const buttonLabel = (selectedStatuses: readonly BranchStatus[]): string =>
  `Status: ${String(selectedStatuses.length)} of ${String(BRANCH_STATUSES.length)}`

export const buildStatusFilter = (
  repositories: readonly Repository[],
  selectedStatuses: readonly BranchStatus[],
): StatusFilter => ({
  buttonLabel: buttonLabel(selectedStatuses),
  isDefault: isDefaultSelection(selectedStatuses),
  options: BRANCH_STATUSES.map((status) => ({
    status,
    label: STATUS_LABELS[status],
    countLabel: String(targetCount(repositories, status)),
    isSelected: selectedStatuses.includes(status),
    toggledStatuses: toggledStatuses(selectedStatuses, status),
  })),
})
