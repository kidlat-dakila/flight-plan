import { useState } from "react"
import {
  applyReviewedChange,
  hiddenFileAnchorIdsOf,
  NO_REVIEWED_MARKS,
  parseReviewedMarks,
  reviewSegment,
  withReviewedTrace,
  withReviewedRail,
  withReviewedWalkthrough,
  type ReviewedMarks,
  type ReviewedSubject,
} from "@flightplan/reviewed-marks"
import type { PublishedReview } from "./published-review"

type PublishedSegment = PublishedReview["segments"][number]

export interface ReviewedMarking {
  readonly rail: PublishedReview["rail"]
  readonly segments: readonly PublishedSegment[]
  readonly onReviewedChange: (subject: ReviewedSubject, isReviewed: boolean) => void
  readonly onShowReviewedChange: (isShown: boolean) => void
}

const readStoredMarks = (storageKey: string): ReviewedMarks => {
  try {
    const text = window.localStorage.getItem(storageKey)
    return text === null ? NO_REVIEWED_MARKS : parseReviewedMarks(JSON.parse(text))
  } catch {
    return NO_REVIEWED_MARKS
  }
}

const writeStoredMarks = (storageKey: string, marks: ReviewedMarks): boolean => {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(marks))
    return true
  } catch {
    return false
  }
}

export const useReviewedMarks = (review: PublishedReview): ReviewedMarking => {
  const { storageKey, segments: outlines } = review.reviewed
  const [marks, setMarks] = useState(() => readStoredMarks(storageKey))
  const [isShowingReviewed, setIsShowingReviewed] = useState(false)
  const filesOf = (segmentId: string) => outlines.find((outline) => outline.segmentId === segmentId)?.files ?? []
  const segmentReviews = review.segments.map((segment) => ({ segment, segmentReview: reviewSegment(filesOf(segment.id), marks, isShowingReviewed) }))
  const reviewedCount = segmentReviews.reduce((count, { segmentReview }) => count + segmentReview.reviewedCount, 0)
  const reviewedSegments = segmentReviews.map(({ segment, segmentReview }) => ({
    segment: {
      ...segment,
      walkthrough: withReviewedWalkthrough(segment.walkthrough, { ...segmentReview, reviewedCount }),
      traceDiagram: withReviewedTrace(segment.traceDiagram, segmentReview),
    },
    hiddenFileAnchorIds: hiddenFileAnchorIdsOf(segment.walkthrough.files, segmentReview),
  }))
  return {
    rail: withReviewedRail(review.rail, new Set(reviewedSegments.flatMap((reviewed) => reviewed.hiddenFileAnchorIds))),
    segments: reviewedSegments.map((reviewed) => reviewed.segment),
    onReviewedChange: (subject, isReviewed) => {
      const changed = applyReviewedChange(outlines.flatMap((outline) => outline.files), marks, subject, isReviewed)
      if (changed === null) return
      writeStoredMarks(storageKey, changed)
      setMarks(changed)
    },
    onShowReviewedChange: setIsShowingReviewed,
  }
}
