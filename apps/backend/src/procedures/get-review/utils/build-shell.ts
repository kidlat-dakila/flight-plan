import { STATUS_LABELS } from "@/procedures/list-repositories/utils/branch-status"
import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import { monogramOf } from "@/procedures/list-repositories/utils/monogram"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { buildArtifactFreshness } from "./build-notices"
import { forgeNameOf } from "./forge-links"
import type { ReviewArtifact, Reviewer, ReviewerState, ReviewTargetDetail } from "./review-artifact"
import type { ReviewHeader, ReviewShell } from "./schemas"

const FORGE_CONFIGURATION_HREF = "/configurations/forge"
const TITLE_SEPARATOR = " • "

const REVIEWER_STATE_PHRASES: Readonly<Record<ReviewerState, string>> = {
  "pending": "has not reviewed yet",
  "commented": "commented",
  "approved": "approved",
  "changes-requested": "requested changes",
}

const toReviewerView = (reviewer: Reviewer): Extract<ReviewHeader, { kind: "pull-request" }>["reviewers"][number] => ({
  name: reviewer.name,
  avatarUrl: reviewer.avatarUrl,
  monogram: monogramOf(reviewer.name),
  state: reviewer.state,
  stateLabel: `${reviewer.name} ${REVIEWER_STATE_PHRASES[reviewer.state]}`,
})

const buildHeader = (
  repository: Repository,
  target: ReviewTarget,
  detail: ReviewTargetDetail | null,
  artifact: ReviewArtifact | null,
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
    reviewers: reviewers.map(toReviewerView),
    reviewersEmptyLabel: reviewers.length === 0 ? "No reviewers yet" : null,
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
): ReviewShell => ({
  documentTitle: [targetTitleOf(target), repository.name].join(TITLE_SEPARATOR),
  lineColor,
  header: buildHeader(repository, target, detail, artifact),
  notice,
})
