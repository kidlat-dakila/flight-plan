import type { ReviewArtifact } from "@flightplan/configurations"

const SEGMENTED_MINIMUM = 2

export const isShownInSegments = (artifact: Pick<ReviewArtifact, "isSegmented" | "segments">): boolean =>
  artifact.isSegmented && artifact.segments.length >= SEGMENTED_MINIMUM
