import { codeLinesIn, isInSpan, lineSpansIn, type HighlightedSource, type LineDecorations, type RowSpan } from "@/code/lines"
import { countLabel } from "@/prose/count-label"
import { lastOf } from "@/walkthrough/last-of"
import type { FileRow, WaypointView } from "@flightplan/configurations"

const CONTEXT_ROWS = 3
const SHORTEST_GAP_ROWS = 4

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

const isShownRow = (
  highlighted: HighlightedSource,
  waypoints: readonly PlacedWaypoint[],
  pinnedLines: readonly number[],
  index: number,
): boolean =>
  isNearChange(highlighted, index)
  || waypoints.some((placed) => isInSpan(index, placed.span))
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

const withShortGapsShown = (runs: readonly RowRun[]): RowRun[] =>
  runs.map((run) => (run.kind === "gap" && lengthOf(run) < SHORTEST_GAP_ROWS ? { ...run, kind: "lines" as const } : run))

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
  pinnedLines: readonly number[],
): RowRun[] =>
  withShortGapsShown(
    highlighted.source.lines.reduce<RowRun[]>(
      (runs, _line, index) =>
        withRow(
          runs,
          isShownRow(highlighted, waypoints, pinnedLines, index) ? "lines" : "gap",
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

const toRunRow = (highlighted: HighlightedSource, run: RowRun, decorations: LineDecorations): FileRow =>
  run.kind === "lines"
    ? { kind: "lines", id: `lines-${String(run.span.start)}`, lines: codeLinesIn(highlighted, run.span, null, decorations) }
    : {
        kind: "gap",
        id: `gap-${String(run.span.start)}`,
        label: countLabel(run.span.end - run.span.start + 1, "unchanged line", "unchanged lines"),
      }

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
  const shownLines = lineSpansIn(highlighted.source, runs.filter((run) => run.kind === "lines").map((run) => run.span))
  const decorations: LineDecorations = { marks: NO_MARKS, shownLines, definitionIds }
  return [
    ...unplacedWaypointRows(waypoints),
    ...runs.flatMap((run) => [...waypointRowsAt(waypoints, run.span.start), toRunRow(highlighted, run, decorations)]),
  ]
}

export const buildFileRows = (
  highlighted: HighlightedSource | null,
  waypoints: readonly PlacedWaypoint[],
  pinnedLines: readonly number[],
  definitionIds: ReadonlySet<string>,
): FileRow[] =>
  highlighted === null
    ? waypoints.filter((placed) => placed.isVisible).map(toWaypointRow)
    : toRows(highlighted, waypoints, rowRunsOf(highlighted, waypoints, pinnedLines), definitionIds)
