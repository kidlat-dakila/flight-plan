import type { AgentModels } from "@/procedures/get-setup/utils/agent-models"
import type { AgentName, Setup } from "@/procedures/get-setup/utils/setup"
import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import { sectionsOf } from "@/procedures/read-artifact/utils/artifact-sections"
import {
  buildBlast,
  buildCodeDefinitions,
  buildCodeLink,
  buildJourney,
  buildWalkthrough,
  buildWalkthroughControls,
  collectCodeLinkIds,
  listWaypointPlaces,
  prepareWalkthrough,
  resolveCodeTarget,
  selectFilterKeys,
  steppingOf,
  waypointAnchorId,
  waypointIdByLinkId,
  type HighlightedSource,
  type PreparedWalkthrough,
  type ResolvedCodeTarget,
  type ReviewedMarks,
  type ReviewViewContext,
  type Stepping,
  type WalkthroughRequest,
  type WaypointPlace,
} from "@flightplan/codegraph"
import type { CodeLink, ReviewArtifact, SectionSwitches, Segment, TokenLine } from "@flightplan/configurations"
import { buildCompleteAction, type BranchLinking } from "./build-complete-action"
import { buildStaleNotice } from "./build-notices"
import { buildCompletionNotice, buildProgress, type WritingActivity } from "./build-progress"
import { buildRail } from "./build-rail"
import { buildShell, NO_REVIEWER_REQUESTS, type ReviewerRequestAbilities } from "./build-shell"
import { buildContext } from "./context"
import { countLabel } from "./count-label"
import {
  attachThreads,
  buildConversation,
  buildReviewDraft,
  buildSharing,
  COMPOSER_LABELS,
  threadLinesOfFile,
  type DiscussionSource,
  type PendingComment,
  type Publication,
} from "./discussion"
import { blobLinkOf, type ForgeLocation } from "./forge-links"
import { buildGenerationOffers } from "./generation-offers"
import type { PullRequestReading } from "./pull-request-forge"
import type { ReviewTargetDetail } from "./review-target-detail"
import type { GetReviewInput, ReviewPage, ReviewShell, SegmentOutline, SegmentView } from "./schemas"
import { buildChangedFiles } from "./start/build-changed-files"
import { buildStartForm } from "./start/build-start-form"
import { buildUnassignedFiles } from "./unassigned-files"

export interface ReviewPageSource {
  readonly repository: Repository
  readonly lineColor: LineColor
  readonly target: ReviewTarget
  readonly isOwn: boolean
  readonly branchLinking: BranchLinking | null
  readonly detail: ReviewTargetDetail | null
  readonly forge: PullRequestReading | null
  readonly artifact: ReviewArtifact | null
  readonly marks: ReviewedMarks
  readonly pendingComments: readonly PendingComment[]
  readonly publications: readonly Publication[]
  readonly isPublishing: boolean
  readonly now: Date
  readonly notice: string | null
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
  readonly setup: Setup
  readonly startableAgents: readonly AgentName[]
  readonly agentModels: AgentModels
  readonly activity: WritingActivity
}

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
      buildCodeLink(resolved, anchorIdOf(linkId), context.blobLinkOf),
    ]),
  )
}

interface SegmentSettings {
  readonly walkthrough: WalkthroughRequest
  readonly sections: SectionSwitches
}

interface SegmentPlace {
  readonly position: number
  readonly segmentCount: number
}

const segmentLabelOf = (position: number): string => `Segment ${String(position)}`

const isUntitled = (segment: Segment): boolean => segment.title.trim() === ""

const segmentTitleOf = (segment: Segment, position: number): string =>
  isUntitled(segment) ? segmentLabelOf(position) : segment.title

const segmentHeadingOf = (segment: Segment, position: number): string =>
  isUntitled(segment) ? segmentLabelOf(position) : `${segmentLabelOf(position)}: ${segment.title}`

const buildOutline = (segment: Segment, { position, segmentCount }: SegmentPlace): SegmentOutline => ({
  heading: segmentHeadingOf(segment, position),
  detailLabel: countLabel(segment.changedPaths.length, "file", "files"),
  label: segment.title,
  paths: [...segment.changedPaths],
  canMoveUp: position > 1,
  canMoveDown: position < segmentCount,
})

const buildSegment = (
  prepared: PreparedWalkthrough,
  isSegmented: boolean,
  place: SegmentPlace,
  settings: SegmentSettings,
  stepping: Stepping,
  places: readonly WaypointPlace[],
  discussion: DiscussionSource | null,
  context: ReviewViewContext,
): SegmentView => {
  const { segment } = prepared
  const { position } = place
  const outline = buildOutline(segment, place)
  const scope = isSegmented ? `${segment.id}-` : ""
  const walkthrough = buildWalkthrough(
    prepared,
    scope,
    settings.walkthrough,
    stepping,
    (path) => threadLinesOfFile(discussion, path),
    context,
  )
  const fileAnchorIdByPath = new Map(walkthrough.files.map((file) => [file.path, file.anchorId] as const))
  const journey = buildJourney(segment, scope, places, context)
  return {
    id: segment.id,
    anchorId: `segment-${segment.id}`,
    title: isSegmented ? segmentTitleOf(segment, position) : null,
    heading: isSegmented ? segmentHeadingOf(segment, position) : null,
    isTitleDraft: isSegmented && isUntitled(segment),
    detailLabel: isSegmented ? outline.detailLabel : null,
    outline,
    context: buildContext(segment, scope, context),
    journey,
    blast: buildBlast(segment, scope, fileAnchorIdByPath, context),
    walkthrough: attachThreads(walkthrough, discussion),
    offers: buildGenerationOffers(settings.sections, {
      scope,
      journeyAnchorId: journey.anchorId,
      walkthroughAnchorId: walkthrough.anchorId,
      isSegmented,
    }),
  }
}

const AUTHOR_LABEL = "Your Flight Plan"
const COMPLETE_STATUS = "complete"

const isUploaded = (source: ReviewPageSource): boolean => source.publications.length > 0

const isKeptPrivate = (source: ReviewPageSource): boolean => source.isOwn && !isUploaded(source)

const isLeftToComplete = (source: ReviewPageSource, artifact: ReviewArtifact): boolean =>
  source.isOwn && artifact.status !== COMPLETE_STATUS

const BRANCH_REASON = "A branch without a code host has no review to submit."

const discussionSourceOf = (source: ReviewPageSource, artifact: ReviewArtifact): DiscussionSource | null =>
  source.forge?.kind !== "read" || isKeptPrivate(source)
    ? null
    : {
        discussion: source.forge.pullRequest.discussion,
        pendingComments: source.pendingComments,
        viewer: source.forge.pullRequest.viewer,
        abilities: source.forge.pullRequest.abilities,
        commit: artifact.commit,
        now: source.now,
      }

const unavailableReasonOf = (source: ReviewPageSource): string | null => {
  if (source.forge === null) return BRANCH_REASON
  return source.forge.kind === "unavailable" ? source.forge.reason : null
}

const reviewerRequestsOf = (source: ReviewPageSource): ReviewerRequestAbilities =>
  source.forge?.kind === "read" && !isKeptPrivate(source) ? source.forge.pullRequest.abilities : NO_REVIEWER_REQUESTS

const placedThreadIdsOf = (segments: readonly SegmentView[]): ReadonlySet<string> =>
  new Set(segments.flatMap((segment) => segment.walkthrough.files).flatMap((file) => file.threads).map((thread) => thread.id))

const buildUnwrittenPage = (source: ReviewPageSource, shell: ReviewShell): ReviewPage => ({
  kind: "missing",
  shell,
  isOwn: source.isOwn,
  changedFiles: buildChangedFiles(source.detail),
  heading: "No Flight Plan Review yet",
  message: "Choose how the review is written, then start it.",
  form: buildStartForm(source.setup, source.startableAgents, source.agentModels),
})

export const buildReviewPage = (source: ReviewPageSource, input: GetReviewInput): ReviewPage => {
  const shell = buildShell(
    source.repository,
    source.lineColor,
    source.target,
    source.detail,
    source.artifact,
    source.notice,
    isKeptPrivate(source) ? AUTHOR_LABEL : null,
    reviewerRequestsOf(source),
  )
  if (source.artifact === null) return buildUnwrittenPage(source, shell)
  const { artifact } = source
  const resolvedTargets = new Map(
    collectCodeLinkIds(artifact.segments, artifact.contextCodeBlocks)
      .map((linkId) => [linkId, resolveCodeTarget(source.sources, linkId)] as const)
      .flatMap(([linkId, resolved]) => (resolved === null ? [] : [[linkId, resolved] as const])),
  )
  const forgeLocation: ForgeLocation = {
    forge: source.repository.forge,
    forgeSlug: source.repository.forgeSlug,
    commit: artifact.commit,
  }
  const linkToBlob: ReviewViewContext["blobLinkOf"] = (path, range) => blobLinkOf(forgeLocation, path, range)
  const knownLinkIds = new Set(resolvedTargets.keys())
  const codeDefinitions = buildCodeDefinitions(source.sources, linkToBlob, { contextCodeBlocks: artifact.contextCodeBlocks, knownLinkIds })
  const context: ReviewViewContext = {
    sources: source.sources,
    solutionTokens: source.solutionTokens,
    knownLinkIds,
    definitionIds: new Set(Object.keys(codeDefinitions)),
    blobLinkOf: linkToBlob,
  }
  const settings: SegmentSettings = {
    walkthrough: { filterKeys: selectFilterKeys(input.filterKeys), isShowingReviewed: source.isOwn || input.isShowingReviewed },
    sections: sectionsOf(artifact),
  }
  const walkthroughs = artifact.segments.map((segment) =>
    prepareWalkthrough(segment, source.marks, settings.walkthrough, context))
  const stepping = steppingOf(walkthroughs)
  const places = walkthroughs.flatMap((prepared) => listWaypointPlaces(prepared, stepping, context))
  const discussion = discussionSourceOf(source, artifact)
  const segments = walkthroughs.map((prepared, index) =>
    buildSegment(prepared, artifact.isSegmented, { position: index + 1, segmentCount: walkthroughs.length }, settings, stepping, places, discussion, context))
  const hasForge = source.detail?.forgeUrl != null
  const isReviewable = !isKeptPrivate(source)
  const conversation = discussion === null ? null : buildConversation(discussion, placedThreadIdsOf(segments))
  return {
    kind: "artifact",
    shell,
    isOwn: source.isOwn,
    completeAction: isLeftToComplete(source, artifact) ? buildCompleteAction(source.branchLinking, source.now) : null,
    staleNotice: buildStaleNotice(source.repository, source.target, artifact, source.detail),
    progress: buildProgress(artifact, source.activity),
    completion: buildCompletionNotice(artifact),
    unassignedFiles: buildUnassignedFiles(artifact),
    rail: buildRail(segments, conversation),
    segments,
    walkthroughControls: buildWalkthroughControls(walkthroughs, settings.walkthrough, stepping),
    conversation,
    composer: discussion === null ? null : COMPOSER_LABELS,
    reviewDraft: isReviewable ? buildReviewDraft(discussion, unavailableReasonOf(source)) : null,
    sharing: isLeftToComplete(source, artifact) ? null : buildSharing(source.publications, hasForge, source.now, source.isPublishing),
    chatLabel: "Chat",
    codeLinks: buildCodeLinks(resolvedTargets, artifact, stepping, context),
    codeDefinitions,
  }
}
