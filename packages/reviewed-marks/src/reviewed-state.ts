import type { ReviewedMarks } from "./marks"
import type { ReviewableFile, ReviewableRootBlock, ReviewableWaypoint } from "./reviewable-file"

export interface ReviewedState {
  readonly isFileReviewed: boolean
  readonly waypointIds: ReadonlySet<string>
  readonly rootBlockIds: ReadonlySet<string>
}

const isMarked = (fingerprintById: Readonly<Record<string, string>>, id: string, fingerprint: string): boolean =>
  Object.hasOwn(fingerprintById, id) && fingerprintById[id] === fingerprint

const isRootBlockMarked = (marks: ReviewedMarks, rootBlock: ReviewableRootBlock): boolean =>
  isMarked(marks.rootBlocks, rootBlock.id, rootBlock.fingerprint)

const isWaypointMarked = (marks: ReviewedMarks, waypoint: ReviewableWaypoint): boolean =>
  isMarked(marks.waypoints, waypoint.id, waypoint.fingerprint)

const isFileMarked = (marks: ReviewedMarks, file: ReviewableFile): boolean =>
  isMarked(marks.files, file.path, file.fingerprint)

export const waypointsInRootBlock = (file: ReviewableFile, rootBlockId: string): ReviewableWaypoint[] =>
  file.waypoints.filter((waypoint) => waypoint.rootBlockIds.includes(rootBlockId))

const isEveryOf = <Item>(items: readonly Item[], isTrue: (item: Item) => boolean): boolean =>
  items.length > 0 && items.every(isTrue)

export const reviewedStateOf = (file: ReviewableFile, marks: ReviewedMarks): ReviewedState => {
  const markedRootBlockIds = new Set(file.rootBlocks.filter((rootBlock) => isRootBlockMarked(marks, rootBlock)).map((rootBlock) => rootBlock.id))
  const isReviewedOnItsOwn = (waypoint: ReviewableWaypoint): boolean =>
    isWaypointMarked(marks, waypoint) || isEveryOf(waypoint.rootBlockIds, (id) => markedRootBlockIds.has(id))
  const isFileReviewed = isFileMarked(marks, file) || isEveryOf(file.waypoints, isReviewedOnItsOwn)
  const waypointIds = new Set(file.waypoints.filter((waypoint) => isFileReviewed || isReviewedOnItsOwn(waypoint)).map((waypoint) => waypoint.id))
  const isRootBlockReviewed = (rootBlock: ReviewableRootBlock): boolean =>
    isFileReviewed
    || markedRootBlockIds.has(rootBlock.id)
    || isEveryOf(waypointsInRootBlock(file, rootBlock.id), (waypoint) => waypointIds.has(waypoint.id))
  return {
    isFileReviewed,
    waypointIds,
    rootBlockIds: new Set(file.rootBlocks.filter(isRootBlockReviewed).map((rootBlock) => rootBlock.id)),
  }
}
