import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import type { TargetOption } from "@/procedures/search-creation-targets/utils/schemas"
import type { RepositoryBranch } from "./repository-branches"
import type { BaseBranchSuggestions } from "./schemas"

const NO_BRANCHES_MESSAGE = "This repository has no branches yet."
const NO_MATCH_MESSAGE = "No branch matches."

const toBaseBranchOption = (branch: RepositoryBranch, now: Date): TargetOption => ({
  id: branch.name,
  label: branch.name,
  detail: formatRelativeTime(branch.committedAt, now),
  stateLabel: null,
  isDisabled: false,
})

const emptyMessageOf = (query: string): string => (query.trim() === "" ? NO_BRANCHES_MESSAGE : NO_MATCH_MESSAGE)

export const withoutBaseBranches = (message: string): BaseBranchSuggestions => ({ options: [], message, detectedBranch: null })

export const buildBaseBranchSuggestions = (
  branches: readonly RepositoryBranch[],
  detectedBranch: string | null,
  query: string,
  now: Date,
): BaseBranchSuggestions => ({
  options: branches.map((branch) => toBaseBranchOption(branch, now)),
  message: branches.length === 0 ? emptyMessageOf(query) : null,
  detectedBranch,
})
