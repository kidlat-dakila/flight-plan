import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { reviewableSegmentFilesOf } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import type { PublishedReviewed } from "./schemas"

const STORAGE_KEY_PREFIX = "flight-plan:reviewed-marks"
const STORAGE_KEY_SEPARATOR = ":"

const storageKeyOf = (key: ReviewKey): string =>
  [STORAGE_KEY_PREFIX, key.repositoryName, key.targetId].join(STORAGE_KEY_SEPARATOR)

export const buildPublishedReviewed = (key: ReviewKey, artifact: ReviewArtifact): PublishedReviewed => ({
  storageKey: storageKeyOf(key),
  segments: artifact.segments.map((segment) => ({ segmentId: segment.id, files: reviewableSegmentFilesOf(segment, artifact.sources) })),
})
