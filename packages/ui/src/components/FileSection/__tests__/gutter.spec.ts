import { placeWaypoints, stemsOf, type GutterRow, type StemTone } from "@/components/FileSection/gutter"
import { codeLine } from "@/lib/__tests__/review-samples"

interface SampleWaypoint {
  readonly id: string
  readonly lines: { readonly lineStart: number, readonly lineEnd: number } | null
}

const waypointRow = (id: string, lines: SampleWaypoint["lines"]): GutterRow<SampleWaypoint> => ({ kind: "waypoint", waypoint: { id, lines } })

const linesRow = (...numbers: string[]): GutterRow<SampleWaypoint> & { readonly kind: "lines" } => ({
  kind: "lines",
  lines: numbers.map((number) => codeLine(number, `line ${number}`, "added")),
})

const toneOf = (tones: Readonly<Record<string, StemTone>>) => (waypointId: string): StemTone | null => tones[waypointId] ?? null

describe("placeWaypoints", () => {
  it("puts each waypoint on the first line of the lines that follow it, and leaves out one with no lines", () => {
    const outer = linesRow("1", "2", "3")
    const inner = linesRow("4", "5")
    const rows = [waypointRow("unplaced", null), waypointRow("outer", { lineStart: 1, lineEnd: 5 }), outer, waypointRow("inner", { lineStart: 4, lineEnd: 5 }), inner]

    const placed = placeWaypoints(rows)

    expect([...placed].map(([line, waypoints]) => [line.numberLabel, waypoints.map((waypoint) => waypoint.id)])).toStrictEqual([
      ["1", ["outer"]],
      ["4", ["inner"]],
    ])
  })

  it("does not carry a waypoint across a gap", () => {
    const rows: GutterRow<SampleWaypoint>[] = [waypointRow("stranded", { lineStart: 9, lineEnd: 9 }), { kind: "gap" }, linesRow("12")]

    expect(placeWaypoints(rows).size).toBe(0)
  })
})

describe("stemsOf", () => {
  it("runs an open waypoint's stem from its first line to the line it ends on, joined to the box above", () => {
    const lines = linesRow("1", "2", "3", "4")
    const rows = [waypointRow("open", { lineStart: 1, lineEnd: 3 }), lines]

    const stems = stemsOf(rows, placeWaypoints(rows), toneOf({ open: "solid" }))

    expect(lines.lines.map((line) => stems.get(line) ?? null)).toStrictEqual([
      { reach: "start", isSolid: true, isJoinedAbove: true },
      { reach: "middle", isSolid: true, isJoinedAbove: false },
      { reach: "end", isSolid: true, isJoinedAbove: false },
      null,
    ])
  })

  it("stops a stem at a gap, draws a previewed one faint, and lets an open stem win where two meet", () => {
    const first = linesRow("1", "2")
    const second = linesRow("2")
    const rows: GutterRow<SampleWaypoint>[] = [
      waypointRow("previewed", { lineStart: 1, lineEnd: 30 }),
      first,
      { kind: "gap" },
      second,
    ]
    const nested = [waypointRow("outer", { lineStart: 1, lineEnd: 2 }), waypointRow("inner", { lineStart: 1, lineEnd: 1 }), linesRow("1", "2")]

    const stems = stemsOf(rows, placeWaypoints(rows), toneOf({ previewed: "faint" }))
    const nestedStems = stemsOf(nested, placeWaypoints(nested), toneOf({ outer: "faint", inner: "solid" }))

    expect(first.lines.map((line) => stems.get(line)?.reach)).toStrictEqual(["start", "end"])
    expect(stems.get(first.lines[0])?.isSolid).toBe(false)
    expect(second.lines.map((line) => stems.get(line))).toStrictEqual([undefined])
    expect([...nestedStems.values()].map((piece) => [piece.reach, piece.isSolid])).toStrictEqual([["single", true], ["end", false]])
  })
})
