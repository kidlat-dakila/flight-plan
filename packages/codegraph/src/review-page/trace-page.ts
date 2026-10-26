import type { HighlightedReview } from "@/code/highlight-review"
import type { BlobLinker } from "@/review-view-context"
import type { WalkthroughRequest } from "@/walkthrough/build"
import type { CodeDefinition, CodeLink, ReviewArtifact, TraceBand } from "@flightplan/configurations"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"
import { prepareReviewView, type ViewPreferences } from "./review-view"
import { shownSegmentHeadingOf } from "./segment-heading"
import { buildSegmentTrace } from "./trace-band"

export interface TracePageSource {
  readonly artifact: ReviewArtifact
  readonly highlighted: HighlightedReview
  readonly preferences: ViewPreferences
}

export interface TracePageSegment {
  readonly id: string
  readonly heading: string | null
  readonly traceDiagram: TraceBand
}

export interface TracePage {
  readonly segments: readonly TracePageSegment[]
  readonly codeLinks: Record<string, CodeLink>
  readonly codeDefinitions: Record<string, CodeDefinition>
}

const EVERY_WAYPOINT: WalkthroughRequest = { filterKeys: [], isShowingReviewed: true }
const NO_CHAT_LINK_IDS: readonly string[] = []

const linkToNoForge: BlobLinker = () => null

export const buildTracePage = ({ artifact, highlighted, preferences }: TracePageSource): TracePage => {
  const view = prepareReviewView({
    artifact,
    highlighted,
    preferences,
    marks: NO_REVIEWED_MARKS,
    request: EVERY_WAYPOINT,
    chatLinkIds: NO_CHAT_LINK_IDS,
    blobLinkOf: linkToNoForge,
    isWriting: false,
  })
  return {
    segments: view.segments.map((prepared, index) => ({
      id: prepared.walkthrough.segment.id,
      heading: shownSegmentHeadingOf(prepared.walkthrough.segment, index + 1, view.isSegmented),
      traceDiagram: buildSegmentTrace(prepared, view),
    })),
    codeLinks: view.codeLinks,
    codeDefinitions: view.codeDefinitions,
  }
}
