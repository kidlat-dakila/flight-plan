import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import type { TargetOption, TargetSuggestions } from "./schemas"

export interface OfferedTarget {
  readonly target: ReviewTarget
  readonly hasFlightPlan: boolean
}

const DETAIL_SEPARATOR = " • "
const TAKEN_LABEL = "Has a Flight Plan"
const NOTHING_OPEN_MESSAGE = "No open pull requests or branches."
const NO_MATCH_MESSAGE = "No pull request or branch matches."

export const targetDetailOf = (target: ReviewTarget, now: Date): string =>
  target.kind === "pull-request"
    ? [`#${String(target.number)}`, target.branch].join(DETAIL_SEPARATOR)
    : ["Branch", formatRelativeTime(target.updatedAt, now)].join(DETAIL_SEPARATOR)

export const toTargetOption = ({ target, hasFlightPlan }: OfferedTarget, now: Date): TargetOption => ({
  id: targetIdOf(target),
  label: target.kind === "pull-request" ? target.title : target.name,
  detail: targetDetailOf(target, now),
  stateLabel: hasFlightPlan ? TAKEN_LABEL : null,
  isDisabled: hasFlightPlan,
})

const emptyMessageOf = (query: string): string => (query.trim() === "" ? NOTHING_OPEN_MESSAGE : NO_MATCH_MESSAGE)

export const buildTargetSuggestions = (offered: readonly OfferedTarget[], query: string, now: Date): TargetSuggestions => ({
  options: offered.map((offer) => toTargetOption(offer, now)),
  message: offered.length === 0 ? emptyMessageOf(query) : null,
})
