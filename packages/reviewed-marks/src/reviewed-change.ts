import type { ReviewedMarks } from "./marks"
import type { ReviewableFile, ReviewableRootBlock, ReviewableWaypoint } from "./reviewable-file"
import { waypointsInRootBlock } from "./reviewed-state"
import type { ReviewedSubject } from "./reviewed-subject"

type FingerprintById = Readonly<Record<string, string>>

const withoutKeys = (record: FingerprintById, keys: readonly string[]): FingerprintById =>
  Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)))

const fingerprintById = (items: readonly (ReviewableWaypoint | ReviewableRootBlock)[]): FingerprintById =>
  Object.fromEntries(items.map((item) => [item.id, item.fingerprint]))

const idsOf = (items: readonly { readonly id: string }[]): string[] => items.map((item) => item.id)

const descendantsOf = (file: ReviewableFile, waypointId: string): ReviewableWaypoint[] => {
  const root = file.waypoints.find((waypoint) => waypoint.id === waypointId)
  if (root === undefined) return []
  const followers = file.waypoints.slice(file.waypoints.indexOf(root) + 1)
  const end = followers.findIndex((waypoint) => waypoint.depth <= root.depth)
  return [root, ...(end < 0 ? followers : followers.slice(0, end))]
}

const rootBlockIdsHolding = (waypoints: readonly ReviewableWaypoint[]): string[] =>
  [...new Set(waypoints.flatMap((waypoint) => waypoint.rootBlockIds))]

const withWaypointChange = (marks: ReviewedMarks, file: ReviewableFile, waypointId: string, isReviewed: boolean): ReviewedMarks => {
  const changed = descendantsOf(file, waypointId)
  return isReviewed
    ? { ...marks, waypoints: { ...marks.waypoints, ...fingerprintById(changed) } }
    : {
        waypoints: withoutKeys(marks.waypoints, idsOf(changed)),
        files: withoutKeys(marks.files, [file.path]),
        rootBlocks: withoutKeys(marks.rootBlocks, rootBlockIdsHolding(changed)),
      }
}

const withFileChange = (marks: ReviewedMarks, file: ReviewableFile, isReviewed: boolean): ReviewedMarks =>
  isReviewed
    ? {
        ...marks,
        waypoints: { ...marks.waypoints, ...fingerprintById(file.waypoints) },
        files: { ...marks.files, [file.path]: file.fingerprint },
      }
    : {
        waypoints: withoutKeys(marks.waypoints, idsOf(file.waypoints)),
        files: withoutKeys(marks.files, [file.path]),
        rootBlocks: withoutKeys(marks.rootBlocks, idsOf(file.rootBlocks)),
      }

const withRootBlockChange = (marks: ReviewedMarks, file: ReviewableFile, rootBlock: ReviewableRootBlock, isReviewed: boolean): ReviewedMarks =>
  isReviewed
    ? { ...marks, rootBlocks: { ...marks.rootBlocks, [rootBlock.id]: rootBlock.fingerprint } }
    : {
        waypoints: withoutKeys(marks.waypoints, idsOf(waypointsInRootBlock(file, rootBlock.id))),
        files: withoutKeys(marks.files, [file.path]),
        rootBlocks: withoutKeys(marks.rootBlocks, [rootBlock.id]),
      }

const changeOf = (file: ReviewableFile, marks: ReviewedMarks, subject: ReviewedSubject, isReviewed: boolean): ReviewedMarks | null => {
  if (subject.kind === "file") return file.path === subject.path ? withFileChange(marks, file, isReviewed) : null
  if (subject.kind === "waypoint") {
    return idsOf(file.waypoints).includes(subject.id) ? withWaypointChange(marks, file, subject.id, isReviewed) : null
  }
  const rootBlock = file.rootBlocks.find((candidate) => candidate.id === subject.id)
  return rootBlock === undefined ? null : withRootBlockChange(marks, file, rootBlock, isReviewed)
}

export const applyReviewedChange = (
  files: readonly ReviewableFile[],
  marks: ReviewedMarks,
  subject: ReviewedSubject,
  isReviewed: boolean,
): ReviewedMarks | null =>
  files.map((file) => changeOf(file, marks, subject, isReviewed)).find((changed) => changed !== null) ?? null
