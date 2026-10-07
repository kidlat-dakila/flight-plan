import type { AgentModels } from "@/procedures/get-setup/utils/agent-models"
import type { AgentName, Setup } from "@/procedures/get-setup/utils/setup"
import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import {
  buildBlast,
  buildCodeLink,
  buildJourney,
  buildWalkthrough,
  buildWalkthroughControls,
  collectCodeLinkIds,
  DEFAULT_DIAGRAM_SETTINGS,
  prepareWalkthrough,
  resolveCodeTarget,
  selectFilterKeys,
  steppingOf,
  waypointAnchorId,
  waypointIdByLinkId,
  type DiagramSettings,
  type HighlightedSource,
  type PreparedWalkthrough,
  type ResolvedCodeTarget,
  type ReviewedMarks,
  type ReviewViewContext,
  type Stepping,
  type WalkthroughRequest,
} from "@flightplan/codegraph"
import type { CodeLink, ReviewArtifact, Segment, TokenLine } from "@flightplan/configurations"
import { buildDraftingNotice, buildStaleNotice } from "./build-notices"
import { buildRail } from "./build-rail"
import { buildShell } from "./build-shell"
import { buildContext } from "./context"
import { countLabel } from "./count-label"
import {
  attachThreads,
  buildConversation,
  buildReviewDraft,
  buildSharing,
  COMPOSER_LABELS,
  threadLinesOfFile,
  type Discussion,
  type Publication,
} from "./discussion"
import { blobLinkOf, type ForgeLocation } from "./forge-links"
import type { ReviewTargetDetail } from "./review-target-detail"
import type { GetReviewInput, ReviewPage, ReviewShell, SegmentView } from "./schemas"
import { buildChangedFiles } from "./start/build-changed-files"
import { buildStartForm } from "./start/build-start-form"

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
  readonly frameTokens: ReadonlyMap<string, TokenLine>
  readonly setup: Setup
  readonly startableAgents: readonly AgentName[]
  readonly agentModels: AgentModels
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
  readonly journey: DiagramSettings
  readonly blast: DiagramSettings
  readonly walkthrough: WalkthroughRequest
}

const segmentLabelOf = (position: number): string => `Segment ${String(position)}`

const isUntitled = (segment: Segment): boolean => segment.title.trim() === ""

const segmentTitleOf = (segment: Segment, position: number): string =>
  isUntitled(segment) ? segmentLabelOf(position) : segment.title

const segmentHeadingOf = (segment: Segment, position: number): string =>
  isUntitled(segment) ? segmentLabelOf(position) : `${segmentLabelOf(position)}: ${segment.title}`

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
    title: isSegmented ? segmentTitleOf(segment, position) : null,
    heading: isSegmented ? segmentHeadingOf(segment, position) : null,
    detailLabel: isSegmented ? countLabel(segment.changedPaths.length, "file", "files") : null,
    context: buildContext(segment, scope, context),
    journey: buildJourney(segment, scope, settings.journey, context),
    blast: buildBlast(segment, scope, settings.blast, context),
    walkthrough: attachThreads(
      buildWalkthrough(
        prepared,
        scope,
        settings.walkthrough,
        stepping,
        (path) => threadLinesOfFile(source.discussion, path),
        context,
      ),
      source.discussion,
      source.now,
    ),
  }
}

const buildUnwrittenPage = (source: ReviewPageSource, shell: ReviewShell): ReviewPage => ({
  kind: "missing",
  shell,
  changedFiles: buildChangedFiles(source.detail),
  heading: "No Flight Plan Review yet",
  message: "Choose how the review is written, then start it.",
  form: buildStartForm(source.setup, source.startableAgents, source.agentModels),
})

export const buildReviewPage = (source: ReviewPageSource, input: GetReviewInput): ReviewPage => {
  const shell = buildShell(source.repository, source.lineColor, source.target, source.detail, source.artifact, source.notice)
  if (source.artifact === null) return buildUnwrittenPage(source, shell)
  const { artifact } = source
  const resolvedTargets = new Map(
    collectCodeLinkIds(artifact.segments)
      .map((linkId) => [linkId, resolveCodeTarget(source.sources, linkId)] as const)
      .flatMap(([linkId, resolved]) => (resolved === null ? [] : [[linkId, resolved] as const])),
  )
  const forgeLocation: ForgeLocation = {
    forge: source.repository.forge,
    forgeSlug: source.repository.forgeSlug,
    commit: artifact.commit,
  }
  const context: ReviewViewContext = {
    sources: source.sources,
    solutionTokens: source.solutionTokens,
    frameTokens: source.frameTokens,
    knownLinkIds: new Set(resolvedTargets.keys()),
    blobLinkOf: (path, range) => blobLinkOf(forgeLocation, path, range),
  }
  const settings: SegmentSettings = {
    journey: DEFAULT_DIAGRAM_SETTINGS,
    blast: DEFAULT_DIAGRAM_SETTINGS,
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
