import type { FileRow, FileSectionView, JourneyBand, JourneyNodeView, NodeCodeView, WalkthroughBand, WaypointView } from "@flightplan/configurations"
import { EVERY_FILE_REVIEWED_MESSAGE, markLabelOf, positionLabelOf, reviewedToggleOf } from "./labels"
import type { ReviewedMarks } from "./marks"
import type { ReviewableFile } from "./reviewable-file"
import { reviewedStateOf, type ReviewedState } from "./reviewed-state"

export interface SegmentReview {
  readonly isShowingReviewed: boolean
  readonly statesByPath: ReadonlyMap<string, ReviewedState>
  readonly shownPaths: ReadonlySet<string>
  readonly shownWaypointIds: readonly string[]
  readonly reviewedCount: number
}

type MarkableWalkthrough = Omit<WalkthroughBand, "files"> & { readonly files: readonly FileSectionView[] }

const NOTHING_REVIEWED: ReviewedState = { isFileReviewed: false, waypointIds: new Set(), rootBlockIds: new Set() }

const shownWaypointIdsOf = (file: ReviewableFile, state: ReviewedState, isShowingReviewed: boolean): string[] =>
  file.waypoints.filter((waypoint) => isShowingReviewed || !state.waypointIds.has(waypoint.id)).map((waypoint) => waypoint.id)

const isFileShown = (file: ReviewableFile, state: ReviewedState, isShowingReviewed: boolean): boolean =>
  (isShowingReviewed || !state.isFileReviewed)
  && (file.waypoints.length === 0 || shownWaypointIdsOf(file, state, isShowingReviewed).length > 0)

export const reviewSegment = (files: readonly ReviewableFile[], marks: ReviewedMarks, isShowingReviewed: boolean): SegmentReview => {
  const statesByPath = new Map(files.map((file) => [file.path, reviewedStateOf(file, marks)] as const))
  const stateOf = (file: ReviewableFile): ReviewedState => statesByPath.get(file.path) ?? NOTHING_REVIEWED
  const shownFiles = files.filter((file) => isFileShown(file, stateOf(file), isShowingReviewed))
  return {
    isShowingReviewed,
    statesByPath,
    shownPaths: new Set(shownFiles.map((file) => file.path)),
    shownWaypointIds: shownFiles.flatMap((file) => shownWaypointIdsOf(file, stateOf(file), isShowingReviewed)),
    reviewedCount: files.reduce((count, file) => count + stateOf(file).waypointIds.size, 0),
  }
}

const isWaypointReviewed = (review: SegmentReview, waypointId: string): boolean =>
  [...review.statesByPath.values()].some((state) => state.waypointIds.has(waypointId))

const neighbourOf = (waypointIds: readonly string[], position: number, offset: number): string | null =>
  position < 0 ? null : (waypointIds[position + offset] ?? null)

const withReviewedWaypoint = (waypoint: WaypointView, review: SegmentReview): WaypointView => {
  const position = review.shownWaypointIds.indexOf(waypoint.id)
  const positionLabel = positionLabelOf(position, review.shownWaypointIds.length)
  return {
    ...waypoint,
    isReviewed: isWaypointReviewed(review, waypoint.id),
    positionLabel,
    previousId: neighbourOf(review.shownWaypointIds, position, -1),
    nextId: neighbourOf(review.shownWaypointIds, position, 1),
    mark: { ...waypoint.mark, label: markLabelOf(waypoint.mark.kindLabel, positionLabel, waypoint.title) },
  }
}

const withReviewedRows = (rows: readonly FileRow[], review: SegmentReview): FileRow[] =>
  rows.flatMap((row): FileRow[] => {
    if (row.kind !== "waypoint") return [row]
    return review.shownWaypointIds.includes(row.waypoint.id) ? [{ ...row, waypoint: withReviewedWaypoint(row.waypoint, review) }] : []
  })

const withReviewedFile = <File extends FileSectionView>(file: File, review: SegmentReview): File => {
  const state = review.statesByPath.get(file.path) ?? NOTHING_REVIEWED
  return {
    ...file,
    isReviewed: state.isFileReviewed,
    rootBlocks: file.rootBlocks.map((rootBlock) => ({ ...rootBlock, isReviewed: state.rootBlockIds.has(rootBlock.id) })),
    rows: withReviewedRows(file.rows, review),
  }
}

export const withReviewedWalkthrough = <Walkthrough extends MarkableWalkthrough>(walkthrough: Walkthrough, review: SegmentReview): Walkthrough => {
  const files = walkthrough.files.filter((file) => review.shownPaths.has(file.path)).map((file) => withReviewedFile(file, review))
  return {
    ...walkthrough,
    emptyMessage: files.length === 0 && walkthrough.files.length > 0 ? EVERY_FILE_REVIEWED_MESSAGE : walkthrough.emptyMessage,
    controls: { ...walkthrough.controls, reviewedToggle: reviewedToggleOf(review.reviewedCount, review.isShowingReviewed) },
    files,
  }
}

const withReviewedCodeView = (codeView: NodeCodeView, review: SegmentReview): NodeCodeView => ({
  ...codeView,
  rows: withReviewedRows(codeView.rows, review),
})

const withReviewedNode = (node: JourneyNodeView, review: SegmentReview): JourneyNodeView => ({
  ...node,
  codeViews: node.codeViews.map((codeView) => withReviewedCodeView(codeView, review)),
  children: node.children.map((child) => withReviewedNode(child, review)),
})

export const withReviewedJourney = (journey: JourneyBand, review: SegmentReview): JourneyBand =>
  journey.diagram === null
    ? journey
    : { ...journey, diagram: { ...journey.diagram, nodes: journey.diagram.nodes.map((node) => withReviewedNode(node, review)) } }
