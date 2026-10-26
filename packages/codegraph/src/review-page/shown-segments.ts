import type { ReviewArtifact, Segment } from "@flightplan/configurations"
import { mergeSegments } from "./merged-segment"

const SEGMENTED_MINIMUM = 2

export const isShownInSegments = (artifact: Pick<ReviewArtifact, "isSegmented" | "segments">): boolean =>
  artifact.isSegmented && artifact.segments.length >= SEGMENTED_MINIMUM

export interface ShownSegment {
  readonly segment: Segment
  readonly traceSegments: readonly Segment[]
}

export const shownSegmentsOf = (artifact: ReviewArtifact, isSegmented: boolean): ShownSegment[] => {
  const [first, ...others] = artifact.segments
  if (isSegmented || others.length === 0) return artifact.segments.map((segment) => ({ segment, traceSegments: [segment] }))
  return [{ segment: mergeSegments([first, ...others]), traceSegments: artifact.segments }]
}
