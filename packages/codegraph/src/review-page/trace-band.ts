import { buildTrace, buildTraceTabs } from "@/trace/build"
import type { Segment, TraceBand } from "@flightplan/configurations"
import type { PreparedSegment, ReviewView } from "./review-view"

export const segmentScopeOf = (segment: Segment, isSegmented: boolean): string => (isSegmented ? `${segment.id}-` : "")

export const buildSegmentTrace = ({ walkthrough: { segment }, traceSegments }: PreparedSegment, view: ReviewView): TraceBand => {
  const scope = segmentScopeOf(segment, view.isSegmented)
  return traceSegments.length > 1
    ? buildTraceTabs(traceSegments, scope, view.places, view.context)
    : buildTrace(segment, scope, view.places, view.context)
}
