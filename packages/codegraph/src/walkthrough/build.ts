import { findSource, isInSpan, rowSpanOf, type HighlightedSource, type RowSpan } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import { firstOf, lastOf } from "@/walkthrough/last-of"
import type { ReviewedMarks } from "@/walkthrough/reviewed-marks"
import type {
  FileSection,
  FileSectionView,
  LineRange,
  Segment,
  WalkthroughBand,
  WalkthroughControls,
  WaypointFilterKey,
  WaypointView,
} from "@flightplan/configurations"
import { buildFileRows, type PlacedWaypoint } from "./file-rows"
import {
  ATTENTION_LABEL,
  buildFinding,
  buildWaypointFilter,
  FINDING_KIND_LABELS,
  flattenWaypoints,
  isFileReviewed,
  isWaypointReviewed,
  matchesFilter,
  mostSevereKind,
  type FlatWaypoint,
  type ReplacedRow,
} from "./waypoints"

const WALKTHROUGH_ANCHOR_NAME = "code-walkthrough"

export const waypointAnchorId = (waypointId: string): string => `waypoint-${waypointId}`

const fileAnchorId = (scope: string, position: number): string => `${scope}file-${String(position + 1)}`

export interface WalkthroughRequest {
  readonly filterKeys: readonly WaypointFilterKey[]
  readonly isShowingReviewed: boolean
}

export type PinnedLineFinder = (path: string) => readonly number[]

interface FileEntry {
  readonly file: FileSection
  readonly position: number
  readonly highlighted: HighlightedSource | null
  readonly waypoints: readonly FlatWaypoint[]
  readonly isReviewed: boolean
}

interface WaypointEntry {
  readonly flat: FlatWaypoint
  readonly span: RowSpan | null
  readonly isReviewed: boolean
  readonly isVisible: boolean
}

const toFileEntry = (file: FileSection, position: number, marks: ReviewedMarks, context: ReviewViewContext): FileEntry => {
  const highlighted = findSource(context.sources, file.path)
  const waypoints = flattenWaypoints(file, highlighted?.source ?? null)
  return { file, position, highlighted, waypoints, isReviewed: isFileReviewed(marks, file.path, waypoints) }
}

const spanOfWaypoint = (entry: FileEntry, flat: FlatWaypoint): RowSpan | null => {
  const range = entry.highlighted?.source.declarations[flat.waypoint.declaration]
  return entry.highlighted === null || range === undefined ? null : rowSpanOf(entry.highlighted.source, range)
}

const toWaypointEntries = (entry: FileEntry, marks: ReviewedMarks, request: WalkthroughRequest): WaypointEntry[] =>
  entry.waypoints.map((flat) => {
    const isReviewed = entry.isReviewed || isWaypointReviewed(marks, flat)
    return {
      flat,
      span: spanOfWaypoint(entry, flat),
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
  readonly orderedIds: readonly string[]
}

const positionLabelOf = (stepping: Stepping, waypointId: string): string =>
  `${String(stepping.orderedIds.indexOf(waypointId) + 1)} of ${String(stepping.orderedIds.length)}`

const neighbourOf = (stepping: Stepping, waypointId: string, offset: number): string | null =>
  stepping.orderedIds.includes(waypointId)
    ? stepping.orderedIds.find((_id, index) => index === stepping.orderedIds.indexOf(waypointId) + offset) ?? null
    : null

const toWaypointView = (
  entry: FileEntry,
  { flat, span, isReviewed }: WaypointEntry,
  stepping: Stepping,
  context: ReviewViewContext,
): WaypointView => {
  const { waypoint } = flat
  const chipKind = mostSevereKind(waypoint.findings)
  const replacedRows = replacedRowsOf(entry.highlighted, span)
  return {
    id: waypoint.id,
    anchorId: waypointAnchorId(waypoint.id),
    depth: flat.depth,
    title: waypoint.title ?? waypoint.declaration,
    isDraft: waypoint.title === null,
    positionLabel: positionLabelOf(stepping, waypoint.id),
    previousId: neighbourOf(stepping, waypoint.id, -1),
    nextId: neighbourOf(stepping, waypoint.id, 1),
    chip: chipKind === null ? null : { kind: chipKind, label: FINDING_KIND_LABELS[chipKind] },
    attentionLabel: waypoint.needsAttention === null ? null : ATTENTION_LABEL,
    reading: waypoint.reading === "" ? null : parseProse(waypoint.reading, context.knownLinkIds),
    unwrittenLabel: "Not written yet.",
    needsAttention: waypoint.needsAttention === null ? null : parseProse(waypoint.needsAttention, context.knownLinkIds),
    findings: waypoint.findings.map((finding) => buildFinding(finding, replacedRows, context)),
    isReviewed,
    reviewLabel: "Reviewed",
  }
}

const toFileView = (
  entry: FileEntry,
  waypointEntries: readonly WaypointEntry[],
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
    title: entry.file.title,
    isReviewed: entry.isReviewed,
    reviewLabel: "File reviewed",
    summary: entry.file.summary.map((item) => parseProse(item, context.knownLinkIds)),
    waypointCountLabel: countLabel(entry.waypoints.length, "waypoint", "waypoints"),
    forgeLink: context.blobLinkOf(entry.file.path, null),
    rows: buildFileRows(entry.highlighted, placed, pinnedLinesOf(entry.file.path), context.definitionIds),
  }
}

interface VisibleFile {
  readonly entry: FileEntry
  readonly waypointEntries: readonly WaypointEntry[]
}

export interface PreparedWalkthrough {
  readonly segment: Segment
  readonly files: readonly VisibleFile[]
  readonly shownFiles: readonly VisibleFile[]
}

const isFileShown = ({ entry, waypointEntries }: VisibleFile, request: WalkthroughRequest): boolean =>
  (request.isShowingReviewed || !entry.isReviewed)
  && (waypointEntries.length === 0 || waypointEntries.some((waypointEntry) => waypointEntry.isVisible))

export const prepareWalkthrough = (
  segment: Segment,
  marks: ReviewedMarks,
  request: WalkthroughRequest,
  context: ReviewViewContext,
): PreparedWalkthrough => {
  const files = segment.walkthrough.files
    .map((file, position) => toFileEntry(file, position, marks, context))
    .map((entry) => ({ entry, waypointEntries: toWaypointEntries(entry, marks, request) }))
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
  orderedIds: walkthroughs.flatMap(visibleWaypointIds),
})

const emptyMessageOf = (prepared: PreparedWalkthrough, request: WalkthroughRequest): string | null => {
  if (prepared.shownFiles.length > 0) return null
  if (prepared.files.length === 0) return "The walkthrough has no files yet."
  if (request.filterKeys.length > 0) return "No waypoint matches the filter."
  return "Every file is reviewed. Show the reviewed files to read them again."
}

export const coverageLabelOf = (coveredCount: number, changedCount: number): string =>
  coveredCount === changedCount
    ? `All ${countLabel(changedCount, "changed file", "changed files")}`
    : `${String(coveredCount)} of ${countLabel(changedCount, "changed file", "changed files")}`

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
  intro: prepared.segment.walkthrough.intro === null
    ? null
    : parseProse(prepared.segment.walkthrough.intro, context.knownLinkIds),
  coverageLabel: coverageLabelOf(prepared.files.length, prepared.segment.changedPaths.length),
  emptyMessage: emptyMessageOf(prepared, request),
  files: prepared.shownFiles.map((file) =>
    toFileView(file.entry, file.waypointEntries, scope, stepping, pinnedLinesOf, context)),
})

export const buildWalkthroughControls = (
  walkthroughs: readonly PreparedWalkthrough[],
  request: WalkthroughRequest,
  stepping: Stepping,
): WalkthroughControls => {
  const waypointEntries = walkthroughs.flatMap((prepared) => prepared.files.flatMap((file) => file.waypointEntries))
  const reviewedCount = waypointEntries.filter((waypointEntry) => waypointEntry.isReviewed).length
  return {
    filter: buildWaypointFilter(waypointEntries.map((waypointEntry) => waypointEntry.flat), request.filterKeys),
    reviewedToggle: {
      label: `Show reviewed (${String(reviewedCount)})`,
      isShown: request.isShowingReviewed,
      isAvailable: reviewedCount > 0,
    },
    stepping: {
      firstWaypointId: firstOf(stepping.orderedIds) ?? null,
      lastWaypointId: lastOf(stepping.orderedIds) ?? null,
      idleLabel: countLabel(stepping.orderedIds.length, "waypoint", "waypoints"),
      previousLabel: "Previous waypoint (K)",
      nextLabel: "Next waypoint (J)",
    },
  }
}
