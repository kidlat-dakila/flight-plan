import { createViewContext, PRICE_PATH } from "@/__tests__/review-fixture"
import { buildNodeCodeViews } from "@/journey/code-views"
import type { WaypointPlace } from "@/walkthrough/build"
import type { FileRow, LineSpan, WaypointView } from "@flightplan/configurations"

const waypointViewOf = (id: string): WaypointView => ({
  id,
  anchorId: id,
  depth: 0,
  title: id,
  isDraft: false,
  positionLabel: "",
  previousId: null,
  nextId: null,
  chip: null,
  attentionLabel: null,
  reading: null,
  unwrittenLabel: "",
  needsAttention: null,
  findings: [],
  isReviewed: false,
  reviewLabel: "",
  lines: null,
  text: { title: "", reading: "", needsAttention: null },
})

const placeOf = (id: string, lineStart: number, lineEnd: number): WaypointPlace => ({
  path: PRICE_PATH,
  range: { lineStart, lineEnd },
  view: waypointViewOf(id),
})

const rowLabelOf = (row: FileRow): string => {
  if (row.kind === "waypoint") return `waypoint ${row.waypoint.id}`
  if (row.kind === "gap") return `gap ${row.label}`
  return `lines ${row.lines.map((line) => line.numberLabel).join(" ")}`
}

const rowLabelsOf = (lines: readonly LineSpan[], places: readonly WaypointPlace[]): string[] =>
  buildNodeCodeViews("node", { path: PRICE_PATH, lines }, { places, changedPaths: [PRICE_PATH] }, createViewContext())
    .flatMap((view) => view.rows)
    .map(rowLabelOf)

describe("the waypoint rows of the code of a node", () => {
  it("puts each waypoint above the first line it covers, and one that starts earlier above the first line shown", () => {
    const places = [placeOf("whole", 1, 14), placeOf("middle", 5, 6), placeOf("late", 8, 8)]

    expect(rowLabelsOf([[3, 9]], places)).toStrictEqual([
      "waypoint whole",
      "lines 3 4",
      "waypoint middle",
      "lines 5 6 7",
      "waypoint late",
      "lines 8 9",
    ])
  })

  it("keeps two waypoints that start on one line together, and shows a waypoint once across the spans it covers", () => {
    const places = [placeOf("outer", 5, 14), placeOf("inner", 5, 6)]

    expect(rowLabelsOf([[5, 6], [12, 12]], places)).toStrictEqual([
      "waypoint outer",
      "waypoint inner",
      "lines 5 6",
      "gap 5 lines hidden",
      "lines 12",
    ])
  })
})
