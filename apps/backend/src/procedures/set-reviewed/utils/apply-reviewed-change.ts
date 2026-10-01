import type { FileSection, ReviewArtifact } from "@/procedures/get-review/utils/review-artifact"
import type { ReviewedMarks } from "@/procedures/get-review/utils/review-store"
import {
  descendantsOf,
  fileFingerprint,
  flattenWaypoints,
  type FlatWaypoint,
} from "@/procedures/get-review/utils/walkthrough/waypoints"
import type { ReviewedSubject } from "./schemas"

interface ReviewedFile {
  readonly path: string
  readonly waypoints: readonly FlatWaypoint[]
}

const toReviewedFile = (artifact: ReviewArtifact, file: FileSection): ReviewedFile => ({
  path: file.path,
  waypoints: flattenWaypoints(file, artifact.sources.find((source) => source.path === file.path) ?? null),
})

const reviewedFilesOf = (artifact: ReviewArtifact): ReviewedFile[] =>
  artifact.segments.flatMap((segment) => segment.walkthrough.files.map((file) => toReviewedFile(artifact, file)))

const withoutKeys = (record: Readonly<Record<string, string>>, keys: readonly string[]): Record<string, string> =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)))

const fingerprintById = (waypoints: readonly FlatWaypoint[]): Record<string, string> =>
  Object.fromEntries(waypoints.map((flat) => [flat.waypoint.id, flat.fingerprint]))

const idsOf = (waypoints: readonly FlatWaypoint[]): string[] => waypoints.map((flat) => flat.waypoint.id)

const withWaypointChange = (
  marks: ReviewedMarks,
  file: ReviewedFile,
  waypointId: string,
  isReviewed: boolean,
): ReviewedMarks => {
  const changed = descendantsOf(file.waypoints, waypointId)
  return isReviewed
    ? { ...marks, waypoints: { ...marks.waypoints, ...fingerprintById(changed) } }
    : { waypoints: withoutKeys(marks.waypoints, idsOf(changed)), files: withoutKeys(marks.files, [file.path]) }
}

const withFileChange = (marks: ReviewedMarks, file: ReviewedFile, isReviewed: boolean): ReviewedMarks =>
  isReviewed
    ? {
        waypoints: { ...marks.waypoints, ...fingerprintById(file.waypoints) },
        files: { ...marks.files, [file.path]: fileFingerprint(file.waypoints) },
      }
    : { waypoints: withoutKeys(marks.waypoints, idsOf(file.waypoints)), files: withoutKeys(marks.files, [file.path]) }

export const applyReviewedChange = (
  artifact: ReviewArtifact,
  marks: ReviewedMarks,
  subject: ReviewedSubject,
  isReviewed: boolean,
): ReviewedMarks | null => {
  const files = reviewedFilesOf(artifact)
  if (subject.kind === "file") {
    const file = files.find((candidate) => candidate.path === subject.path)
    return file === undefined ? null : withFileChange(marks, file, isReviewed)
  }
  const file = files.find((candidate) => idsOf(candidate.waypoints).includes(subject.id))
  return file === undefined ? null : withWaypointChange(marks, file, subject.id, isReviewed)
}
