import { codeLinesIn, isInSpan, type HighlightedSource, type LineDecorations, type RowSpan } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import { lastOf } from "@/walkthrough/last-of"
import type { FileRow, LineCollapse, WaypointView } from "@flightplan/configurations"

const CONTEXT_ROWS = 3
const SHORTEST_GAP_ROWS = 4

export interface ShownRows {
  readonly pinnedLines: readonly number[]
  readonly focusSpans: readonly RowSpan[] | null
}

export interface PlacedWaypoint {
  readonly view: WaypointView
  readonly span: RowSpan | null
  readonly isVisible: boolean
}

export interface RootBlockSpan {
  readonly id: string
  readonly span: RowSpan
}

interface TriggeredRootBlock extends RootBlockSpan {
  readonly triggerIndex: number
}

interface RowRun {
  readonly kind: "lines" | "gap"
  readonly span: RowSpan
}

const isNearChange = (highlighted: HighlightedSource, index: number): boolean =>
  highlighted.source.lines
    .slice(Math.max(0, index - CONTEXT_ROWS), index + CONTEXT_ROWS + 1)
    .some((line) => line.mark !== "context")

const isPinnedRow = (highlighted: HighlightedSource, pinnedLines: readonly number[], index: number): boolean =>
  highlighted.source.lines.some((line, position) => position === index && line.number !== null && pinnedLines.includes(line.number))

const isInFocus = (focusSpans: ShownRows["focusSpans"], index: number): boolean =>
  focusSpans === null || focusSpans.some((span) => isInSpan(index, span))

const isShownRow = (
  highlighted: HighlightedSource,
  waypoints: readonly PlacedWaypoint[],
  { pinnedLines, focusSpans }: ShownRows,
  index: number,
): boolean =>
  (isInFocus(focusSpans, index) && (isNearChange(highlighted, index) || waypoints.some((placed) => isInSpan(index, placed.span))))
  || isPinnedRow(highlighted, pinnedLines, index)

const startsWaypoint = (waypoints: readonly PlacedWaypoint[], index: number): boolean =>
  waypoints.some((placed) => placed.isVisible && placed.span?.start === index)

const withRow = (
  runs: readonly RowRun[],
  kind: RowRun["kind"],
  index: number,
  isBreak: boolean,
): RowRun[] => {
  const last = lastOf(runs)
  return last?.kind !== kind || isBreak
    ? [...runs, { kind, span: { start: index, end: index } }]
    : [...runs.slice(0, -1), { kind, span: { start: last.span.start, end: index } }]
}

const lengthOf = (run: RowRun): number => run.span.end - run.span.start + 1

const BLANK_PATTERN = /^\s*$/

const isRunInFocus = (focusSpans: ShownRows["focusSpans"], run: RowRun): boolean =>
  isInFocus(focusSpans, run.span.start) && isInFocus(focusSpans, run.span.end)

const isBlankRun = (highlighted: HighlightedSource, run: RowRun): boolean =>
  highlighted.source.lines.every((line, index) => !isInSpan(index, run.span) || BLANK_PATTERN.test(line.text))

const isShownShortGap = (highlighted: HighlightedSource, focusSpans: ShownRows["focusSpans"], run: RowRun): boolean =>
  run.kind === "gap" && lengthOf(run) < SHORTEST_GAP_ROWS && (isRunInFocus(focusSpans, run) || isBlankRun(highlighted, run))

const withShortGapsShown = (highlighted: HighlightedSource, focusSpans: ShownRows["focusSpans"]) => (runs: readonly RowRun[]): RowRun[] =>
  runs.map((run) => (isShownShortGap(highlighted, focusSpans, run) ? { ...run, kind: "lines" as const } : run))

const withRunMerged = (waypoints: readonly PlacedWaypoint[]) =>
  (runs: readonly RowRun[], run: RowRun): RowRun[] => {
    const last = lastOf(runs)
    return last?.kind === "lines" && run.kind === "lines" && !startsWaypoint(waypoints, run.span.start)
      ? [...runs.slice(0, -1), { kind: "lines", span: { start: last.span.start, end: run.span.end } }]
      : [...runs, run]
  }

const rowRunsOf = (
  highlighted: HighlightedSource,
  waypoints: readonly PlacedWaypoint[],
  shownRows: ShownRows,
): RowRun[] =>
  withShortGapsShown(highlighted, shownRows.focusSpans)(
    highlighted.source.lines.reduce<RowRun[]>(
      (runs, _line, index) =>
        withRow(
          runs,
          isShownRow(highlighted, waypoints, shownRows, index) ? "lines" : "gap",
          index,
          startsWaypoint(waypoints, index),
        ),
      [],
    ),
  ).reduce<RowRun[]>(withRunMerged(waypoints), [])

const isRunHolding = (run: RowRun, span: RowSpan): boolean =>
  run.kind === "lines" && run.span.start <= span.end && run.span.end >= span.start

const shownSpanOf = (run: RowRun, rootBlock: RootBlockSpan): RowSpan => ({
  start: Math.max(run.span.start, rootBlock.span.start),
  end: Math.min(run.span.end, rootBlock.span.end),
})

const NOT_FOUND = -1

const triggerIndexIn = (highlighted: HighlightedSource, span: RowSpan): number => {
  const firstKept = highlighted.source.lines.findIndex((line, index) => isInSpan(index, span) && line.mark !== "removed")
  return firstKept === NOT_FOUND ? span.start : firstKept
}

const withTrigger = (highlighted: HighlightedSource, runs: readonly RowRun[]) => (rootBlock: RootBlockSpan): TriggeredRootBlock[] => {
  const firstRun = runs.find((run) => isRunHolding(run, rootBlock.span))
  return firstRun === undefined ? [] : [{ ...rootBlock, triggerIndex: triggerIndexIn(highlighted, shownSpanOf(firstRun, rootBlock)) }]
}

const isAfterTrigger = (rootBlock: TriggeredRootBlock, span: RowSpan): boolean =>
  span.start > rootBlock.triggerIndex && span.end <= rootBlock.span.end

const rootBlockIdHolding = (rootBlocks: readonly TriggeredRootBlock[], span: RowSpan): string | null =>
  rootBlocks.find((rootBlock) => isAfterTrigger(rootBlock, span))?.id ?? null

const toCollapse = (run: RowRun, rootBlock: TriggeredRootBlock, span: RowSpan): LineCollapse => ({
  rootBlockId: rootBlock.id,
  fromLine: span.start - run.span.start + 1,
  toLine: span.end - run.span.start + 1,
  hasTrigger: span.start === rootBlock.triggerIndex,
})

const piecesAroundTrigger = (span: RowSpan, triggerIndex: number): RowSpan[] =>
  isInSpan(triggerIndex, span) && triggerIndex > span.start
    ? [{ start: span.start, end: triggerIndex - 1 }, { start: triggerIndex, end: span.end }]
    : [span]

const collapsesOf = (run: RowRun, rootBlocks: readonly TriggeredRootBlock[]): LineCollapse[] =>
  rootBlocks
    .filter((rootBlock) => isRunHolding(run, rootBlock.span))
    .flatMap((rootBlock) =>
      piecesAroundTrigger(shownSpanOf(run, rootBlock), rootBlock.triggerIndex).map((span) => toCollapse(run, rootBlock, span)))

const toWaypointRow = (placed: PlacedWaypoint, rootBlockId: string | null): FileRow => ({
  kind: "waypoint",
  id: `waypoint-${placed.view.id}`,
  waypoint: placed.view,
  rootBlockId,
})

const holdsChange = (highlighted: HighlightedSource, span: RowSpan): boolean =>
  highlighted.source.lines.some((line, index) => isInSpan(index, span) && line.mark !== "context")

const gapLabelOf = (highlighted: HighlightedSource, span: RowSpan): string =>
  holdsChange(highlighted, span)
    ? countLabel(lengthOf({ kind: "gap", span }), "line hidden by the filter", "lines hidden by the filter")
    : countLabel(lengthOf({ kind: "gap", span }), "unchanged line", "unchanged lines")

const toRunRow = (highlighted: HighlightedSource, run: RowRun, rootBlocks: readonly TriggeredRootBlock[], decorations: LineDecorations): FileRow =>
  run.kind === "lines"
    ? {
        kind: "lines",
        id: `lines-${String(run.span.start)}`,
        lines: codeLinesIn(highlighted, run.span, null, decorations),
        collapses: collapsesOf(run, rootBlocks),
      }
    : { kind: "gap", id: `gap-${String(run.span.start)}`, label: gapLabelOf(highlighted, run.span), rootBlockId: rootBlockIdHolding(rootBlocks, run.span) }

const waypointRowsAt = (waypoints: readonly PlacedWaypoint[], rootBlocks: readonly TriggeredRootBlock[], index: number): FileRow[] =>
  waypoints
    .filter((placed) => placed.isVisible && placed.span?.start === index)
    .map((placed) => toWaypointRow(placed, rootBlockIdHolding(rootBlocks, { start: index, end: index })))

const unplacedWaypointRows = (waypoints: readonly PlacedWaypoint[]): FileRow[] =>
  waypoints.filter((placed) => placed.isVisible && placed.span === null).map((placed) => toWaypointRow(placed, null))

const NO_MARKS: LineDecorations["marks"] = []

const toRows = (
  highlighted: HighlightedSource,
  waypoints: readonly PlacedWaypoint[],
  runs: readonly RowRun[],
  rootBlockSpans: readonly RootBlockSpan[],
  definitionIds: ReadonlySet<string>,
): FileRow[] => {
  const decorations: LineDecorations = { marks: NO_MARKS, definitionIds }
  const rootBlocks = rootBlockSpans.flatMap(withTrigger(highlighted, runs))
  return [
    ...unplacedWaypointRows(waypoints),
    ...runs.flatMap((run) => [...waypointRowsAt(waypoints, rootBlocks, run.span.start), toRunRow(highlighted, run, rootBlocks, decorations)]),
  ]
}

export const buildFileRows = (
  highlighted: HighlightedSource | null,
  waypoints: readonly PlacedWaypoint[],
  shownRows: ShownRows,
  rootBlockSpans: readonly RootBlockSpan[],
  definitionIds: ReadonlySet<string>,
): FileRow[] =>
  highlighted === null
    ? unplacedWaypointRows(waypoints.map((placed) => ({ ...placed, span: null })))
    : toRows(highlighted, waypoints, rowRunsOf(highlighted, waypoints, shownRows), rootBlockSpans, definitionIds)
