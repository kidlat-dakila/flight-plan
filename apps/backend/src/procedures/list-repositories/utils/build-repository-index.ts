import { authorKeyOf, buildAuthorFilter, selectAuthorKeys } from "./author-filter"
import { STATUS_LABELS } from "./branch-status"
import { FORGE_PROBLEM_MESSAGES } from "./forge-problem-messages"
import { formatRelativeTime } from "./format-relative-time"
import { lineColorAt } from "./line-color"
import { monogramOf } from "./monogram"
import type { BranchStatus, ForgeAdapterName, Repository, ReviewTarget } from "./repository"
import type {
  LabelSegment,
  NewTargetPrompt,
  RepositoryLine,
  RepositoryLineContent,
  RepositoryListing,
  RepositoryListRequest,
  ReviewTargetStop,
  StopAuthor,
} from "./schemas"
import { buildStatusFilter, matchingTargets, selectStatuses } from "./status-filter"
import { targetIdOf } from "./target-id"

const FORGE_CONFIGURATION_HREF = "/configurations/forge"
const UNAVAILABLE_COUNT_LABEL = "Unavailable"
const LABEL_SEPARATOR = " • "

const FORGE_LABELS: Record<ForgeAdapterName, string> = {
  git: "Local git",
  gh: "GitHub",
  github: "GitHub",
  gitlab: "GitLab",
  glab: "GitLab",
  bitbucket: "Bitbucket",
}

const countLabel = (count: number, singular: string, plural: string): string =>
  `${String(count)} ${count === 1 ? singular : plural}`

export const repositoryHref = (repository: Pick<Repository, "name">): string => `/pr-reviews/${encodeURIComponent(repository.name)}`

const plain = (text: string): LabelSegment => ({ text, kind: "plain" })

const code = (text: string): LabelSegment => ({ text, kind: "code" })

const targetTitle = (target: ReviewTarget): LabelSegment =>
  target.kind === "pull-request" ? plain(target.title) : code(target.name)

const targetDetails = (target: ReviewTarget): LabelSegment[] =>
  target.kind === "pull-request"
    ? [plain(`#${String(target.number)}`), code(target.branch)]
    : [plain("Local branch")]

const targetAuthor = (target: ReviewTarget): StopAuthor | null =>
  target.kind === "pull-request"
    ? { name: target.author, avatarUrl: target.authorAvatarUrl, monogram: monogramOf(target.author) }
    : null

const byLatestUpdate = (first: ReviewTarget, second: ReviewTarget): number =>
  second.updatedAt.getTime() - first.updatedAt.getTime()

const toReviewTargetStop = (repository: Repository, target: ReviewTarget, now: Date): ReviewTargetStop => ({
  id: targetIdOf(target),
  title: targetTitle(target),
  details: targetDetails(target),
  author: targetAuthor(target),
  href: `${repositoryHref(repository)}/${encodeURIComponent(targetIdOf(target))}`,
  branchStatus: target.branchStatus,
  statusLabel: STATUS_LABELS[target.branchStatus],
  updatedLabel: formatRelativeTime(target.updatedAt, now),
})

interface LineEntry {
  readonly repository: Repository
  readonly position: number
  readonly visibleTargets: readonly ReviewTarget[]
}

const NEW_TARGET_KIND_LABELS: Record<ReviewTarget["kind"], string> = {
  "pull-request": "New pull request",
  "branch": "New branch",
}

const toNewTargetPrompt = (repository: Repository, target: ReviewTarget, now: Date): NewTargetPrompt => ({
  id: targetIdOf(target),
  kindLabel: NEW_TARGET_KIND_LABELS[target.kind],
  title: targetTitle(target),
  details: targetDetails(target),
  author: targetAuthor(target),
  updatedLabel: formatRelativeTime(target.updatedAt, now),
  createReviewHref: `${repositoryHref(repository)}/${encodeURIComponent(targetIdOf(target))}`,
})

const newTargetPrompts = (repository: Repository, now: Date): NewTargetPrompt[] =>
  repository.targets
    .filter((target) => target.isNew)
    .sort(byLatestUpdate)
    .map((target) => toNewTargetPrompt(repository, target, now))

const NO_FOLLOWED_AUTHORS_MESSAGE
  = "Nobody is tracked here, so no branches are listed. Track an author in this repository's configuration."

const emptyMessage = (repository: Repository): string => {
  if (repository.forge !== "git") return "No open pull requests."
  return repository.hasFollowedAuthors ? "No branches to review." : NO_FOLLOWED_AUTHORS_MESSAGE
}

const hiddenMessage = (hiddenCount: number): string =>
  `${countLabel(hiddenCount, "review target is", "review targets are")} hidden by the filters.`

const toLineContent = ({ repository, visibleTargets }: LineEntry, now: Date): RepositoryLineContent => {
  if (repository.problem !== null) {
    return {
      kind: "problem",
      message: FORGE_PROBLEM_MESSAGES[repository.problem.kind],
      detail: repository.problem.detail,
      actionLabel: "Open forge configuration",
      actionHref: FORGE_CONFIGURATION_HREF,
    }
  }
  if (repository.targets.length === 0) return { kind: "empty", message: emptyMessage(repository) }
  if (visibleTargets.length === 0) return { kind: "empty", message: hiddenMessage(repository.targets.length) }
  return {
    kind: "targets",
    targets: [...visibleTargets].sort(byLatestUpdate).map((target) => toReviewTargetStop(repository, target, now)),
  }
}

const sourceSegments = (repository: Repository): LabelSegment[] => [
  plain(FORGE_LABELS[repository.forge]),
  code(repository.forgeSlug ?? repository.path),
]

const targetCountLabel = (visibleCount: number, totalCount: number): string => {
  const totalLabel = countLabel(totalCount, "review target", "review targets")
  return visibleCount === totalCount ? totalLabel : `${String(visibleCount)} of ${totalLabel}`
}

const lineCountLabel = ({ repository, visibleTargets }: LineEntry): string =>
  repository.problem === null
    ? targetCountLabel(visibleTargets.length, repository.targets.length)
    : UNAVAILABLE_COUNT_LABEL

const toRepositoryLine = (entry: LineEntry, now: Date): RepositoryLine => ({
  name: entry.repository.name,
  lineColor: lineColorAt(entry.position),
  lineLabel: entry.repository.name.charAt(0).toUpperCase(),
  source: sourceSegments(entry.repository),
  countLabel: lineCountLabel(entry),
  createReviewHref: `${repositoryHref(entry.repository)}/create`,
  configurationHref: `${repositoryHref(entry.repository)}/configurations`,
  configurationLabel: `Configure ${entry.repository.name}`,
  addTargetLabel: `Add a branch to ${entry.repository.name}`,
  newTargets: newTargetPrompts(entry.repository, now),
  content: toLineContent(entry, now),
})

export const buildRepositoryLine = (repository: Repository, position: number, now: Date): RepositoryLine =>
  toRepositoryLine({ repository, position, visibleTargets: repository.targets }, now)

interface Selection {
  readonly statuses: readonly BranchStatus[]
  readonly authorKeys: readonly string[]
}

const isSelected = (target: ReviewTarget, selection: Selection): boolean =>
  selection.statuses.includes(target.branchStatus) && selection.authorKeys.includes(authorKeyOf(target))

const toLineEntries = (repositories: readonly Repository[], selection: Selection): LineEntry[] =>
  repositories.map((repository, position) => ({
    repository,
    position,
    visibleTargets: repository.targets.filter((target) => isSelected(target, selection)),
  }))

const withStatusMatchesOnly = (repositories: readonly Repository[], statuses: readonly BranchStatus[]): Repository[] =>
  repositories.map((repository) => ({ ...repository, targets: matchingTargets(repository, statuses) }))

const targetTotal = (repositories: readonly Repository[]): number =>
  repositories.reduce((total, repository) => total + repository.targets.length, 0)

const visibleTargetTotal = (entries: readonly LineEntry[]): number =>
  entries.reduce((total, entry) => total + entry.visibleTargets.length, 0)

const summaryLabel = (repositories: readonly Repository[], entries: readonly LineEntry[]): string =>
  [
    countLabel(repositories.length, "repository", "repositories"),
    targetCountLabel(visibleTargetTotal(entries), targetTotal(repositories)),
  ].join(LABEL_SEPARATOR)

export const buildRepositoryIndex = (
  repositories: readonly Repository[],
  now: Date,
  notice: string | null,
  request: RepositoryListRequest,
): RepositoryListing => {
  if (repositories.length === 0) return { kind: "empty", notice }
  const statuses = selectStatuses(request.statuses)
  const statusMatches = withStatusMatchesOnly(repositories, statuses)
  const selection: Selection = { statuses, authorKeys: selectAuthorKeys(statusMatches, request.authors) }
  const entries = toLineEntries(repositories, selection)
  return {
    kind: "repositories",
    notice,
    summaryLabel: summaryLabel(repositories, entries),
    statusFilter: buildStatusFilter(repositories, selection.statuses),
    authorFilter: buildAuthorFilter(statusMatches, selection.authorKeys),
    repositories: entries.map((entry) => toRepositoryLine(entry, now)),
  }
}
