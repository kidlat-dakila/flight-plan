import { reviewableFilesOf } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import { applyReviewedChange, type ReviewedMarks, type ReviewedSubject } from "@flightplan/reviewed-marks"

export const applyArtifactReviewedChange = (
  artifact: ReviewArtifact,
  marks: ReviewedMarks,
  subject: ReviewedSubject,
  isReviewed: boolean,
): ReviewedMarks | null => applyReviewedChange(reviewableFilesOf(artifact), marks, subject, isReviewed)
