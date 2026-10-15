import { codeLinesIn, isInSpan, type HighlightedSource, type LineDecorations, type RowSpan } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import { lastOf } from "@/walkthrough/last-of"
import type { FileRow, WaypointView } from "@flightplan/configurations"

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

const toWaypointRow = (placed: PlacedWaypoint): FileRow => ({
  kind: "waypoint",
  id: `waypoint-${placed.view.id}`,
  waypoint: placed.view,
})

const holdsChange = (highlighted: HighlightedSource, span: RowSpan): boolean =>
  highlighted.source.lines.some((line, index) => isInSpan(index, span) && line.mark !== "context")

const gapLabelOf = (highlighted: HighlightedSource, span: RowSpan): string =>
  holdsChange(highlighted, span)
    ? countLabel(lengthOf({ kind: "gap", span }), "line hidden by the filter", "lines hidden by the filter")
    : countLabel(lengthOf({ kind: "gap", span }), "unchanged line", "unchanged lines")

const toRunRow = (highlighted: HighlightedSource, run: RowRun, decorations: LineDecorations): FileRow =>
  run.kind === "lines"
    ? { kind: "lines", id: `lines-${String(run.span.start)}`, lines: codeLinesIn(highlighted, run.span, null, decorations) }
    : { kind: "gap", id: `gap-${String(run.span.start)}`, label: gapLabelOf(highlighted, run.span) }

const waypointRowsAt = (waypoints: readonly PlacedWaypoint[], index: number): FileRow[] =>
  waypoints.filter((placed) => placed.isVisible && placed.span?.start === index).map(toWaypointRow)

const unplacedWaypointRows = (waypoints: readonly PlacedWaypoint[]): FileRow[] =>
  waypoints.filter((placed) => placed.isVisible && placed.span === null).map(toWaypointRow)

const NO_MARKS: LineDecorations["marks"] = []

const toRows = (
  highlighted: HighlightedSource,
  waypoints: readonly PlacedWaypoint[],
  runs: readonly RowRun[],
  definitionIds: ReadonlySet<string>,
): FileRow[] => {
  const decorations: LineDecorations = { marks: NO_MARKS, definitionIds }
  return [
    ...unplacedWaypointRows(waypoints),
    ...runs.flatMap((run) => [...waypointRowsAt(waypoints, run.span.start), toRunRow(highlighted, run, decorations)]),
  ]
}

export const buildFileRows = (
  highlighted: HighlightedSource | null,
  waypoints: readonly PlacedWaypoint[],
  shownRows: ShownRows,
  definitionIds: ReadonlySet<string>,
): FileRow[] =>
  highlighted === null
    ? waypoints.filter((placed) => placed.isVisible).map(toWaypointRow)
    : toRows(highlighted, waypoints, rowRunsOf(highlighted, waypoints, shownRows), definitionIds)
