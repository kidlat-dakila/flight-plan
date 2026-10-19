import { findSource, isInSpan, rowSpanOf, type HighlightedSource, type RowSpan } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type {
  FileSection,
  FileSectionView,
  LineRange,
  RootBlockView,
  Segment,
  WalkthroughBand,
  Waypoint,
  WalkthroughControls,
  WaypointView,
} from "@flightplan/configurations"
import {
  EVERY_FILE_REVIEWED_MESSAGE,
  markLabelOf,
  positionLabelOf,
  reviewedStateOf,
  reviewedToggleOf,
  type ReviewedMarks,
  type ReviewedState,
} from "@flightplan/reviewed-marks"
import { buildFileRows, type PlacedWaypoint, type RootBlockSpan } from "./file-rows"
import { listFileRootBlocks, reviewableFileOf, type FileRootBlock } from "./reviewable-file"
import { rootBlockSpanOf } from "./root-blocks"
import { buildWaypointFilter, matchesFilter, type FilterKey } from "./waypoint-filter"
import {
  ATTENTION_LABEL,
  buildFinding,
  countLabelsOf,
  FINDING_KIND_LABELS,
  flattenWaypoints,
  markKindOf,
  mostSevereKind,
  WAYPOINT_MARK_LABELS,
  type FlatWaypoint,
  type ReplacedRow,
} from "./waypoints"

const WALKTHROUGH_ANCHOR_NAME = "code-walkthrough"
const PATH_SEPARATOR = "/"
const TITLE_SEGMENT_COUNT = 2

const fileTitleOf = (path: string): string => path.split(PATH_SEPARATOR).slice(-TITLE_SEGMENT_COUNT).join(PATH_SEPARATOR)

export const waypointAnchorId = (waypointId: string): string => `waypoint-${waypointId}`

const fileAnchorId = (scope: string, position: number): string => `${scope}file-${String(position + 1)}`

export interface WalkthroughRequest {
  readonly filterKeys: readonly FilterKey[]
  readonly isShowingReviewed: boolean
}

export type PinnedLineFinder = (path: string) => readonly number[]

interface FileEntry {
  readonly file: FileSection
  readonly position: number
  readonly highlighted: HighlightedSource | null
  readonly waypoints: readonly FlatWaypoint[]
  readonly rootBlocks: readonly FileRootBlock[]
  readonly state: ReviewedState
}

interface WaypointEntry {
  readonly flat: FlatWaypoint
  readonly span: RowSpan | null
  readonly rootBlockSpans: readonly RowSpan[]
  readonly isReviewed: boolean
  readonly isVisible: boolean
}

const toFileEntry = (file: FileSection, position: number, marks: ReviewedMarks, context: ReviewViewContext): FileEntry => {
  const highlighted = findSource(context.sources, file.path)
  const source = highlighted?.source ?? null
  const waypoints = flattenWaypoints(file, source)
  const rootBlocks = listFileRootBlocks(file.path, waypoints, source)
  const state = reviewedStateOf(reviewableFileOf(file.path, waypoints, rootBlocks, source), marks)
  return { file, position, highlighted, waypoints, rootBlocks, state }
}

const spanOfWaypoint = (entry: FileEntry, flat: FlatWaypoint): RowSpan | null => {
  const range = entry.highlighted?.source.declarations[flat.waypoint.declaration]
  return entry.highlighted === null || range === undefined ? null : rowSpanOf(entry.highlighted.source, range)
}

const rootBlockSpansOf = (entry: FileEntry, flat: FlatWaypoint, span: RowSpan | null): RowSpan[] => {
  const source = entry.highlighted?.source ?? null
  const rootSpans = source === null
    ? []
    : flat.rootBlocks
        .filter((root) => root.astGraph.filePath === entry.file.path)
        .flatMap((root) => rootBlockSpanOf(root, source) ?? [])
  return rootSpans.length > 0 || span === null ? rootSpans : [span]
}

const toWaypointEntries = (entry: FileEntry, request: WalkthroughRequest): WaypointEntry[] =>
  entry.waypoints.map((flat) => {
    const isReviewed = entry.state.waypointIds.has(flat.waypoint.id)
    const span = spanOfWaypoint(entry, flat)
    return {
      flat,
      span,
      rootBlockSpans: rootBlockSpansOf(entry, flat, span),
      isReviewed,
      isVisible: matchesFilter(flat, request.filterKeys) && (request.isShowingReviewed || !isReviewed),
    }
  })

const replacedRowsOf = (highlighted: HighlightedSource | null, span: RowSpan | null): ReplacedRow[] =>
  (highlighted?.source.lines ?? [])
    .map((line, index) => ({ line, index }))
    .filter(({ line, index }) => isInSpan(index, span) && line.mark !== "removed")
    .map(({ line, index }) => ({ line, tokens: highlighted?.tokenLines[index] ?? [] }))

export interface Stepping {
  readonly segmentWaypointIds: readonly (readonly string[])[]
}

const NO_WAYPOINT_IDS: readonly string[] = []

const segmentOrderOf = (stepping: Stepping, waypointId: string): readonly string[] =>
  stepping.segmentWaypointIds.find((waypointIds) => waypointIds.includes(waypointId)) ?? NO_WAYPOINT_IDS

export const isSteppedWaypoint = (stepping: Stepping, waypointId: string): boolean =>
  segmentOrderOf(stepping, waypointId).length > 0

const steppedPositionLabelOf = (stepping: Stepping, waypointId: string): string => {
  const waypointIds = segmentOrderOf(stepping, waypointId)
  return positionLabelOf(waypointIds.indexOf(waypointId), waypointIds.length)
}

const neighbourOf = (stepping: Stepping, waypointId: string, offset: number): string | null => {
  const waypointIds = segmentOrderOf(stepping, waypointId)
  return waypointIds.includes(waypointId)
    ? waypointIds.find((_id, index) => index === waypointIds.indexOf(waypointId) + offset) ?? null
    : null
}

const RANGE_DASH = "\u2013"

const rangeLabelOf = (range: LineRange | null): string | null => {
  if (range === null) return null
  return range.lineStart === range.lineEnd
    ? `Line ${String(range.lineStart)}`
    : `Lines ${String(range.lineStart)}${RANGE_DASH}${String(range.lineEnd)}`
}

const hasAttentionReason = (waypoint: Waypoint): waypoint is Waypoint & { readonly needsAttention: string } =>
  waypoint.needsAttention !== null && waypoint.needsAttention !== ""

const toWaypointView = (
  entry: FileEntry,
  { flat, span, isReviewed }: WaypointEntry,
  stepping: Stepping,
  context: ReviewViewContext,
): WaypointView => {
  const { waypoint } = flat
  const chipKind = mostSevereKind(waypoint.findings)
  const replacedRows = replacedRowsOf(entry.highlighted, span)
  const title = waypoint.title ?? waypoint.declaration
  const positionLabel = steppedPositionLabelOf(stepping, waypoint.id)
  const lines = entry.highlighted?.source.declarations[waypoint.declaration] ?? null
  const markKind = markKindOf(waypoint)
  const markKindLabel = WAYPOINT_MARK_LABELS[markKind]
  return {
    id: waypoint.id,
    anchorId: waypointAnchorId(waypoint.id),
    depth: flat.depth,
    title,
    isDraft: waypoint.title === null,
    positionLabel,
    rangeLabel: rangeLabelOf(lines),
    mark: { kind: markKind, kindLabel: markKindLabel, label: markLabelOf(markKindLabel, positionLabel, title) },
    previousId: neighbourOf(stepping, waypoint.id, -1),
    nextId: neighbourOf(stepping, waypoint.id, 1),
    chip: chipKind === null ? null : { kind: chipKind, label: FINDING_KIND_LABELS[chipKind] },
    attentionLabel: waypoint.needsAttention === null ? null : ATTENTION_LABEL,
    reading: waypoint.reading === "" ? null : parseProse(waypoint.reading, context.knownLinkIds),
    unwrittenLabel: "Not written yet.",
    needsAttention: hasAttentionReason(waypoint) ? parseProse(waypoint.needsAttention, context.knownLinkIds) : null,
    findings: waypoint.findings.map((finding) => buildFinding(finding, replacedRows, context)),
    isReviewed,
    reviewLabel: "Reviewed",
    lines,
    text: { title: waypoint.title ?? "", reading: waypoint.reading, needsAttention: waypoint.needsAttention },
  }
}

const toRootBlockView = (rootBlock: FileRootBlock, state: ReviewedState): RootBlockView => ({
  id: rootBlock.id,
  isReviewed: state.rootBlockIds.has(rootBlock.id),
  reviewLabel: "Reviewed",
  reviewName: `Reviewed: ${rootBlock.label}`,
  expandLabel: `Expand ${rootBlock.label}`,
  collapseLabel: `Collapse ${rootBlock.label}`,
})

const rootBlockSpansOfFile = (rootBlocks: readonly FileRootBlock[]): RootBlockSpan[] =>
  rootBlocks.flatMap(({ id, span }) => (span === null ? [] : [{ id, span }]))

const toFileView = (
  { entry, waypointEntries, focusSpans }: VisibleFile,
  scope: string,
  stepping: Stepping,
  pinnedLinesOf: PinnedLineFinder,
  context: ReviewViewContext,
): FileSectionView => {
  const placed: PlacedWaypoint[] = waypointEntries.map((waypointEntry) => ({
    view: toWaypointView(entry, waypointEntry, stepping, context),
    span: waypointEntry.span,
    isVisible: waypointEntry.isVisible,
  }))
  return {
    anchorId: fileAnchorId(scope, entry.position),
    path: entry.file.path,
    title: fileTitleOf(entry.file.path),
    isReviewed: entry.state.isFileReviewed,
    reviewLabel: "File reviewed",
    countLabels: countLabelsOf(entry.waypoints),
    forgeLink: context.blobLinkOf(entry.file.path, null),
    rootBlocks: entry.rootBlocks.map((rootBlock) => toRootBlockView(rootBlock, entry.state)),
    rows: buildFileRows(
      entry.highlighted,
      placed,
      { pinnedLines: pinnedLinesOf(entry.file.path), focusSpans },
      rootBlockSpansOfFile(entry.rootBlocks),
      context.definitionIds,
    ),
  }
}

const toFileOrder = (files: readonly VisibleFile[]): WalkthroughBand["fileOrder"] =>
  files.map(({ entry }, position) => ({
    path: entry.file.path,
    heading: fileTitleOf(entry.file.path),
    detailLabel: countLabel(entry.waypoints.length, "waypoint", "waypoints"),
    canMoveUp: position > 0,
    canMoveDown: position < files.length - 1,
  }))

interface VisibleFile {
  readonly entry: FileEntry
  readonly waypointEntries: readonly WaypointEntry[]
  readonly focusSpans: readonly RowSpan[] | null
}

export interface PreparedWalkthrough {
  readonly segment: Segment
  readonly files: readonly VisibleFile[]
  readonly shownFiles: readonly VisibleFile[]
}

const withFocus = (entry: FileEntry, waypointEntries: readonly WaypointEntry[], request: WalkthroughRequest): VisibleFile => ({
  entry,
  waypointEntries,
  focusSpans: request.filterKeys.length === 0
    ? null
    : waypointEntries.filter((waypointEntry) => waypointEntry.isVisible).flatMap((waypointEntry) => waypointEntry.rootBlockSpans),
})

const isFileShown = ({ entry, waypointEntries }: VisibleFile, request: WalkthroughRequest): boolean =>
  (request.isShowingReviewed || !entry.state.isFileReviewed)
  && (waypointEntries.length === 0 || waypointEntries.some((waypointEntry) => waypointEntry.isVisible))

export const prepareWalkthrough = (
  segment: Segment,
  marks: ReviewedMarks,
  request: WalkthroughRequest,
  context: ReviewViewContext,
): PreparedWalkthrough => {
  const files = segment.walkthrough.files
    .map((file, position) => toFileEntry(file, position, marks, context))
    .map((entry) => withFocus(entry, toWaypointEntries(entry, request), request))
  return { segment, files, shownFiles: files.filter((file) => isFileShown(file, request)) }
}

export interface WaypointPlace {
  readonly path: string
  readonly range: LineRange
  readonly view: WaypointView
}

export const listWaypointPlaces = (prepared: PreparedWalkthrough, stepping: Stepping, context: ReviewViewContext): WaypointPlace[] =>
  prepared.shownFiles.flatMap(({ entry, waypointEntries }) =>
    waypointEntries.flatMap((waypointEntry): WaypointPlace[] => {
      const range = entry.highlighted?.source.declarations[waypointEntry.flat.waypoint.declaration]
      return range === undefined || !waypointEntry.isVisible
        ? []
        : [{ path: entry.file.path, range, view: toWaypointView(entry, waypointEntry, stepping, context) }]
    }))

const visibleWaypointIds = (prepared: PreparedWalkthrough): string[] =>
  prepared.shownFiles.flatMap((file) =>
    file.waypointEntries.filter((waypointEntry) => waypointEntry.isVisible).map(({ flat }) => flat.waypoint.id))

export const steppingOf = (walkthroughs: readonly PreparedWalkthrough[]): Stepping => ({
  segmentWaypointIds: walkthroughs.map(visibleWaypointIds),
})

const emptyMessageOf = (prepared: PreparedWalkthrough, request: WalkthroughRequest): string | null => {
  if (prepared.shownFiles.length > 0) return null
  if (prepared.files.length === 0) return "The walkthrough has no files yet."
  if (request.filterKeys.length > 0) return "No waypoint matches the filter."
  return EVERY_FILE_REVIEWED_MESSAGE
}

export const coverageLabelOf = (coveredCount: number, changedCount: number): string =>
  coveredCount === changedCount
    ? `All ${countLabel(changedCount, "changed file", "changed files")}`
    : `${String(coveredCount)} of ${countLabel(changedCount, "changed file", "changed files")}`

export const buildWalkthroughControls = (prepared: PreparedWalkthrough, request: WalkthroughRequest): WalkthroughControls => {
  const waypointEntries = prepared.files.flatMap((file) => file.waypointEntries)
  const reviewedCount = waypointEntries.filter((waypointEntry) => waypointEntry.isReviewed).length
  return {
    filter: buildWaypointFilter(waypointEntries.map((waypointEntry) => waypointEntry.flat), request.filterKeys),
    reviewedToggle: reviewedToggleOf(reviewedCount, request.isShowingReviewed),
    stepping: {
      previousLabel: "Previous waypoint",
      nextLabel: "Next waypoint",
    },
    currentReview: { markLabel: "Mark as reviewed", reviewedLabel: "Reviewed" },
  }
}

export const buildWalkthrough = (
  prepared: PreparedWalkthrough,
  scope: string,
  request: WalkthroughRequest,
  stepping: Stepping,
  pinnedLinesOf: PinnedLineFinder,
  context: ReviewViewContext,
): WalkthroughBand => ({
  anchorId: `${scope}${WALKTHROUGH_ANCHOR_NAME}`,
  heading: "Code Walkthrough",
  coverageLabel: coverageLabelOf(prepared.files.length, prepared.segment.changedPaths.length),
  emptyMessage: emptyMessageOf(prepared, request),
  controls: buildWalkthroughControls(prepared, request),
  files: prepared.shownFiles.map((file) =>
    toFileView(file, scope, stepping, pinnedLinesOf, context)),
  fileOrder: toFileOrder(prepared.files),
})
