import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { targetDetailOf } from "@/procedures/search-creation-targets/utils/build-target-suggestions"
import type { TargetOption, TargetSuggestions } from "@/procedures/search-creation-targets/utils/schemas"

const LISTED_LABEL = "Already listed"
const NOTHING_TO_ADD_MESSAGE = "No branches to add."
const NO_MATCH_MESSAGE = "No branch or pull request matches."

const toAddableOption = (target: ReviewTarget, listedTargetIds: readonly string[], now: Date): TargetOption => {
  const isListed = listedTargetIds.includes(targetIdOf(target))
  return {
    id: targetIdOf(target),
    label: target.kind === "pull-request" ? target.title : target.name,
    detail: targetDetailOf(target, now),
    stateLabel: isListed ? LISTED_LABEL : null,
    isDisabled: isListed,
  }
}

const emptyMessageOf = (query: string): string => (query.trim() === "" ? NOTHING_TO_ADD_MESSAGE : NO_MATCH_MESSAGE)

export const buildAddableSuggestions = (
  targets: readonly ReviewTarget[],
  listedTargetIds: readonly string[],
  query: string,
  now: Date,
): TargetSuggestions => ({
  options: targets.map((target) => toAddableOption(target, listedTargetIds, now)),
  message: targets.length === 0 ? emptyMessageOf(query) : null,
})
