import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { buildBlast } from "./blast/build"
import { buildDraftingNotice, buildStaleNotice } from "./build-notices"
import { buildRail } from "./build-rail"
import { buildShell } from "./build-shell"
import type { TokenLine } from "./code/highlighter"
import type { HighlightedSource } from "./code/lines"
import { buildCodeLink, collectCodeLinkIds, resolveCodeTarget, waypointIdByLinkId, type ResolvedCodeTarget } from "./code/links"
import { buildContext, type ReviewViewContext } from "./context"
import { countLabel } from "./count-label"
import { selectDiagramSettings } from "./diagram/configuration"
import { buildConversation, buildReviewDraft, buildSharing, COMPOSER_LABELS, type Discussion, type Publication } from "./discussion"
import { buildJourney } from "./journey/build"
import type { DiagramSettings } from "./journey/filter"
import type { ReviewArtifact, ReviewTargetDetail } from "./review-artifact"
import type { ReviewedMarks } from "./review-store"
import type { CodeLink, GetReviewInput, ReviewPage, SegmentView } from "./schemas"
import {
  buildWalkthrough,
  buildWalkthroughControls,
  prepareWalkthrough,
  steppingOf,
  waypointAnchorId,
  type PreparedWalkthrough,
  type Stepping,
  type WalkthroughRequest,
} from "./walkthrough/build"
import { selectFilterKeys } from "./walkthrough/waypoints"

export interface ReviewPageSource {
  readonly repository: Repository
  readonly lineColor: LineColor
  readonly target: ReviewTarget
  readonly detail: ReviewTargetDetail | null
  readonly artifact: ReviewArtifact | null
  readonly marks: ReviewedMarks
  readonly discussion: Discussion
  readonly publications: readonly Publication[]
  readonly now: Date
  readonly notice: string | null
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
}

const createHref = (repository: Repository, target: ReviewTarget): string =>
  `/pr-reviews/${encodeURIComponent(repository.name)}/create?target=${encodeURIComponent(targetIdOf(target))}`

const buildCodeLinks = (
  resolvedTargets: ReadonlyMap<string, ResolvedCodeTarget>,
  artifact: ReviewArtifact,
  stepping: Stepping,
  context: ReviewViewContext,
): Record<string, CodeLink> => {
  const waypointIds = waypointIdByLinkId(artifact.segments)
  const anchorIdOf = (linkId: string): string | null => {
    const waypointId = waypointIds.get(linkId)
    return waypointId !== undefined && stepping.orderedIds.includes(waypointId) ? waypointAnchorId(waypointId) : null
  }
  return Object.fromEntries(
    [...resolvedTargets].map(([linkId, resolved]) => [
      linkId,
      buildCodeLink(resolved, anchorIdOf(linkId), context.forgeLocation),
    ]),
  )
}

interface SegmentSettings {
  readonly journey: DiagramSettings
  readonly blast: DiagramSettings
  readonly walkthrough: WalkthroughRequest
}

const buildSegment = (
  prepared: PreparedWalkthrough,
  isSegmented: boolean,
  position: number,
  settings: SegmentSettings,
  stepping: Stepping,
  source: ReviewPageSource,
  context: ReviewViewContext,
): SegmentView => {
  const { segment } = prepared
  const scope = isSegmented ? `${segment.id}-` : ""
  return {
    id: segment.id,
    anchorId: `segment-${segment.id}`,
    title: isSegmented ? segment.title : null,
    heading: isSegmented ? `Segment ${String(position)}: ${segment.title}` : null,
    detailLabel: isSegmented ? countLabel(segment.changedPaths.length, "file", "files") : null,
    context: buildContext(segment, scope, context),
    journey: buildJourney(segment, scope, settings.journey, context),
    blast: buildBlast(segment, scope, settings.blast, context),
    walkthrough: buildWalkthrough(
      prepared,
      scope,
      settings.walkthrough,
      stepping,
      { discussion: source.discussion, now: source.now },
      context,
    ),
  }
}

export const buildReviewPage = (source: ReviewPageSource, input: GetReviewInput): ReviewPage => {
  const shell = buildShell(source.repository, source.lineColor, source.target, source.detail, source.artifact, source.notice)
  if (source.artifact === null) {
    return {
      kind: "missing",
      shell,
      heading: "No Flight Plan Review yet",
      message: "Ask your coding agent to review this with the Flight Plan review skill, or create the review here.",
      createLink: { href: createHref(source.repository, source.target), label: "Create Flight Plan" },
    }
  }
  const { artifact } = source
  const resolvedTargets = new Map(
    collectCodeLinkIds(artifact.segments)
      .map((linkId) => [linkId, resolveCodeTarget(source.sources, linkId)] as const)
      .flatMap(([linkId, resolved]) => (resolved === null ? [] : [[linkId, resolved] as const])),
  )
  const context: ReviewViewContext = {
    sources: source.sources,
    solutionTokens: source.solutionTokens,
    knownLinkIds: new Set(resolvedTargets.keys()),
    forgeLocation: {
      forge: source.repository.forge,
      forgeSlug: source.repository.forgeSlug,
      commit: artifact.commit,
    },
  }
  const settings: SegmentSettings = {
    journey: selectDiagramSettings(input.journey),
    blast: selectDiagramSettings(input.blast),
    walkthrough: { filterKeys: selectFilterKeys(input.filterKeys), isShowingReviewed: input.isShowingReviewed },
  }
  const walkthroughs = artifact.segments.map((segment) =>
    prepareWalkthrough(segment, source.marks, settings.walkthrough, context))
  const stepping = steppingOf(walkthroughs)
  const segments = walkthroughs.map((prepared, index) =>
    buildSegment(prepared, artifact.isSegmented, index + 1, settings, stepping, source, context))
  const hasForge = source.detail?.forgeUrl != null
  const conversation = hasForge ? buildConversation(source.discussion, source.now) : null
  return {
    kind: "artifact",
    shell,
    staleNotice: buildStaleNotice(source.repository, source.target, artifact, source.detail),
    draftingNotice: buildDraftingNotice(artifact),
    rail: buildRail(segments, conversation),
    segments,
    walkthroughControls: buildWalkthroughControls(walkthroughs, settings.walkthrough, stepping),
    conversation,
    composer: hasForge ? COMPOSER_LABELS : null,
    reviewDraft: buildReviewDraft(source.discussion, hasForge ? null : "A branch without a code host has no review to submit."),
    sharing: buildSharing(source.publications, hasForge, source.now),
    chatLabel: "Chat",
    codeLinks: buildCodeLinks(resolvedTargets, artifact, stepping, context),
  }
}
