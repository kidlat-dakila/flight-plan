import { buildCodeDefinitions } from "@/code/definitions"
import type { HighlightedReview } from "@/code/highlight-review"
import type { HighlightedSource } from "@/code/lines"
import { buildCodeLink, collectCodeLinkIds, resolveCodeTarget, waypointIdByLinkId, type ResolvedCodeTarget } from "@/code/links"
import type { BlobLinker, ReviewViewContext } from "@/review-view-context"
import {
  isSteppedWaypoint,
  listWaypointPlaces,
  prepareWalkthrough,
  steppingOf,
  waypointAnchorId,
  type PreparedWalkthrough,
  type Stepping,
  type WalkthroughRequest,
  type WaypointPlace,
} from "@/walkthrough/build"
import { DEFAULT_SPOTLIGHT, DEFAULT_WALKTHROUGH_ORDER, type CodeDefinition, type CodeLink, type ReviewArtifact, type Segment } from "@flightplan/configurations"
import type { ReviewedMarks } from "@flightplan/reviewed-marks"
import { isShownInSegments, shownSegmentsOf } from "./shown-segments"

export type ViewPreferences = Pick<ReviewViewContext, "spotlight" | "walkthroughOrder">

export const DEFAULT_VIEW_PREFERENCES: ViewPreferences = { spotlight: DEFAULT_SPOTLIGHT, walkthroughOrder: DEFAULT_WALKTHROUGH_ORDER }

export interface ReviewViewSource {
  readonly artifact: ReviewArtifact
  readonly highlighted: HighlightedReview
  readonly preferences: ViewPreferences
  readonly marks: ReviewedMarks
  readonly request: WalkthroughRequest
  readonly chatLinkIds: readonly string[]
  readonly blobLinkOf: BlobLinker
  readonly isWriting: boolean
}

export interface PreparedSegment {
  readonly walkthrough: PreparedWalkthrough
  readonly traceSegments: readonly Segment[]
}

export interface ReviewView {
  readonly context: ReviewViewContext
  readonly isSegmented: boolean
  readonly segments: readonly PreparedSegment[]
  readonly stepping: Stepping
  readonly places: readonly WaypointPlace[]
  readonly codeLinks: Record<string, CodeLink>
  readonly codeDefinitions: Record<string, CodeDefinition>
}

const resolveCodeTargets = (
  artifact: ReviewArtifact,
  chatLinkIds: readonly string[],
  sources: readonly HighlightedSource[],
): ReadonlyMap<string, ResolvedCodeTarget> =>
  new Map(
    [...new Set([...collectCodeLinkIds(artifact.segments, artifact.contextCodeBlocks), ...chatLinkIds])]
      .map((linkId) => [linkId, resolveCodeTarget(sources, linkId)] as const)
      .flatMap(([linkId, resolved]) => (resolved === null ? [] : [[linkId, resolved] as const])),
  )

const buildCodeLinks = (
  resolvedTargets: ReadonlyMap<string, ResolvedCodeTarget>,
  segments: readonly Segment[],
  stepping: Stepping,
  blobLinkOf: BlobLinker,
): Record<string, CodeLink> => {
  const waypointIds = waypointIdByLinkId(segments)
  const anchorIdOf = (linkId: string): string | null => {
    const waypointId = waypointIds.get(linkId)
    return waypointId !== undefined && isSteppedWaypoint(stepping, waypointId) ? waypointAnchorId(waypointId) : null
  }
  return Object.fromEntries(
    [...resolvedTargets].map(([linkId, resolved]) => [linkId, buildCodeLink(resolved, anchorIdOf(linkId), blobLinkOf)]),
  )
}

const viewContextOf = (
  source: ReviewViewSource,
  knownLinkIds: ReadonlySet<string>,
  codeDefinitions: Record<string, CodeDefinition>,
): ReviewViewContext => ({
  sources: source.highlighted.sources,
  solutionTokens: source.highlighted.solutionTokens,
  knownLinkIds,
  definitionIds: new Set(Object.keys(codeDefinitions)),
  blobLinkOf: source.blobLinkOf,
  spotlight: source.preferences.spotlight,
  walkthroughOrder: source.preferences.walkthroughOrder,
  isWriting: source.isWriting,
})

export const prepareReviewView = (source: ReviewViewSource): ReviewView => {
  const { artifact, highlighted } = source
  const resolvedTargets = resolveCodeTargets(artifact, source.chatLinkIds, highlighted.sources)
  const knownLinkIds = new Set(resolvedTargets.keys())
  const codeDefinitions = buildCodeDefinitions(highlighted.sources, source.blobLinkOf, { contextCodeBlocks: artifact.contextCodeBlocks, knownLinkIds })
  const context = viewContextOf(source, knownLinkIds, codeDefinitions)
  const isSegmented = isShownInSegments(artifact)
  const segments = shownSegmentsOf(artifact, isSegmented).map(({ segment, traceSegments }) => ({
    walkthrough: prepareWalkthrough(segment, source.marks, source.request, context),
    traceSegments,
  }))
  const walkthroughs = segments.map((prepared) => prepared.walkthrough)
  const stepping = steppingOf(walkthroughs)
  return {
    context,
    isSegmented,
    segments,
    stepping,
    places: walkthroughs.flatMap((prepared) => listWaypointPlaces(prepared, stepping, context)),
    codeLinks: buildCodeLinks(resolvedTargets, artifact.segments, stepping, source.blobLinkOf),
    codeDefinitions,
  }
}
