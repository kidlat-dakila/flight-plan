import { toReviewTargetStop } from "@/procedures/list-repositories/utils/build-repository-index"
import { FORGE_PROBLEM_MESSAGES } from "@/procedures/list-repositories/utils/forge-problem-messages"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { DEFAULT_STATUSES } from "@/procedures/list-repositories/utils/status-filter"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import type { TargetSwitcher } from "./schemas"

export interface TargetSwitch {
  readonly repository: Repository
  readonly currentTargetId: string
  readonly query: string
}

const SEARCH_PLACEHOLDER = "Search by title or author"
const NO_TARGETS_LABEL = "No other branches are listed in this repository."
const NO_MATCH_LABEL = "No pull request or branch matches."
const WHITESPACE_PATTERN = /\s+/

const headingOf = (repository: Repository): string => `Branches in ${repository.name}`

const isListed = (currentTargetId: string) => (target: ReviewTarget): boolean =>
  DEFAULT_STATUSES.includes(target.branchStatus) || targetIdOf(target) === currentTargetId

const searchTextOf = (target: ReviewTarget): string =>
  (target.kind === "pull-request"
    ? `${target.title} #${String(target.number)} ${target.branch} ${target.author}`
    : target.name).toLowerCase()

const termsOf = (query: string): readonly string[] =>
  query.toLowerCase().split(WHITESPACE_PATTERN).filter((term) => term !== "")

const matchesEvery = (terms: readonly string[]) => (target: ReviewTarget): boolean => {
  const searchText = searchTextOf(target)
  return terms.every((term) => searchText.includes(term))
}

const byLatestUpdate = (first: ReviewTarget, second: ReviewTarget): number =>
  second.updatedAt.getTime() - first.updatedAt.getTime()

const listedTargetsOf = ({ repository, currentTargetId, query }: TargetSwitch): readonly ReviewTarget[] =>
  repository.targets
    .filter(isListed(currentTargetId))
    .filter(matchesEvery(termsOf(query)))
    .sort(byLatestUpdate)

const emptyLabelOf = ({ repository, query }: TargetSwitch, listedTargets: readonly ReviewTarget[]): string | null => {
  if (repository.problem !== null) return FORGE_PROBLEM_MESSAGES[repository.problem.kind]
  if (listedTargets.length > 0) return null
  return query.trim() === "" ? NO_TARGETS_LABEL : NO_MATCH_LABEL
}

export const buildTargetSwitcher = (targetSwitch: TargetSwitch, now: Date): TargetSwitcher => {
  const listedTargets = listedTargetsOf(targetSwitch)
  return {
    heading: headingOf(targetSwitch.repository),
    searchPlaceholder: SEARCH_PLACEHOLDER,
    emptyLabel: emptyLabelOf(targetSwitch, listedTargets),
    currentTargetId: targetSwitch.currentTargetId,
    targets: listedTargets.map((target) => toReviewTargetStop(targetSwitch.repository, target, now)),
  }
}
