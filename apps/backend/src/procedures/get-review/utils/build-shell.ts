import { STATUS_LABELS } from "@/procedures/list-repositories/utils/branch-status"
import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { ReviewArtifact } from "@flightplan/configurations"
import { buildArtifactFreshness } from "./build-notices"
import { forgeNameOf } from "./forge-links"
import type { Reviewer, ReviewerState, ReviewTargetDetail } from "./review-target-detail"
import type { ReviewerRequest, ReviewHeader, ReviewShell } from "./schemas"

const FORGE_CONFIGURATION_HREF = "/configurations/forge"
const TITLE_SEPARATOR = " • "

const REVIEWER_STATE_PHRASES: Readonly<Record<ReviewerState, string>> = {
  "pending": "has not reviewed yet",
  "commented": "commented",
  "approved": "approved",
  "changes-requested": "requested changes",
}

const REVIEWER_REQUEST: ReviewerRequest = {
  buttonLabel: "Request a reviewer",
  heading: "Request a reviewer",
  searchPlaceholder: "Search people",
  emptyLabel: "Nobody matches.",
  requestLabel: "Request",
}

type ReviewerView = Extract<ReviewHeader, { kind: "pull-request" }>["reviewers"][number]

export interface ReviewerRequestAbilities {
  readonly canRequestReviewers: boolean
  readonly canRequestAgain: boolean
}

export const NO_REVIEWER_REQUESTS: ReviewerRequestAbilities = { canRequestReviewers: false, canRequestAgain: false }

const requestOf = (reviewer: Reviewer, abilities: ReviewerRequestAbilities): ReviewerView["request"] => {
  if (!abilities.canRequestReviewers || reviewer.login === null) return null
  if (reviewer.state === "pending") return { login: reviewer.login, label: `Remove the request to ${reviewer.name}`, isRemoving: true }
  return abilities.canRequestAgain
    ? { login: reviewer.login, label: `Request a review from ${reviewer.name} again`, isRemoving: false }
    : null
}

const toReviewerView = (reviewer: Reviewer, abilities: ReviewerRequestAbilities): ReviewerView => ({
  name: reviewer.name,
  avatarUrl: reviewer.avatarUrl,
  monogram: monogramOf(reviewer.name),
  state: reviewer.state,
  stateLabel: `${reviewer.name} ${REVIEWER_STATE_PHRASES[reviewer.state]}`,
  request: requestOf(reviewer, abilities),
})

const buildHeader = (
  repository: Repository,
  target: ReviewTarget,
  detail: ReviewTargetDetail | null,
  artifact: ReviewArtifact | null,
  abilities: ReviewerRequestAbilities,
): ReviewHeader => {
  const artifactFreshness = buildArtifactFreshness(artifact, detail)
  if (target.kind === "branch") {
    return {
      kind: "branch",
      branch: target.name,
      forgeMessage: `${forgeNameOf(repository.forge) ?? "Local git"} has no reviews to show`,
      artifactFreshness,
      action: { href: FORGE_CONFIGURATION_HREF, label: "Connect a code host" },
    }
  }
  const reviewers = detail?.reviewers ?? []
  return {
    kind: "pull-request",
    title: target.title,
    author: { name: target.author, avatarUrl: target.authorAvatarUrl, monogram: monogramOf(target.author) },
    status: target.branchStatus,
    statusLabel: STATUS_LABELS[target.branchStatus],
    artifactFreshness,
    reviewers: reviewers.map((reviewer) => toReviewerView(reviewer, abilities)),
    reviewersEmptyLabel: reviewers.length === 0 ? "No reviewers yet" : null,
    reviewerRequest: abilities.canRequestReviewers ? REVIEWER_REQUEST : null,
    forgeLink: detail?.forgeUrl == null ? null : { href: detail.forgeUrl, label: "View pull request" },
  }
}

export const targetTitleOf = (target: ReviewTarget): string =>
  target.kind === "pull-request" ? target.title : target.name

export const buildShell = (
  repository: Repository,
  lineColor: LineColor,
  target: ReviewTarget,
  detail: ReviewTargetDetail | null,
  artifact: ReviewArtifact | null,
  notice: string | null,
  authorLabel: string | null,
  abilities: ReviewerRequestAbilities = NO_REVIEWER_REQUESTS,
): ReviewShell => ({
  documentTitle: [targetTitleOf(target), repository.name].join(TITLE_SEPARATOR),
  lineColor,
  header: buildHeader(repository, target, detail, artifact, abilities),
  authorLabel,
  notice,
})
