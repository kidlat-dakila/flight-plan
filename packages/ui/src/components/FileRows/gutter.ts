import type { StemPiece, StemReach } from "@/components/WaypointMark"
import type { CodeLine } from "@/lib/review-content"

interface SpannedWaypoint {
  readonly id: string
  readonly lines: { readonly lineStart: number, readonly lineEnd: number } | null
}

export type GutterRow<Waypoint extends SpannedWaypoint>
  = | { readonly kind: "lines", readonly lines: readonly CodeLine[] }
    | { readonly kind: "gap" }
    | { readonly kind: "waypoint", readonly waypoint: Waypoint }

export type StemTone = "solid" | "faint"

type LineSlot = CodeLine | null

interface Placement<Waypoint> {
  readonly placed: ReadonlyMap<CodeLine, readonly Waypoint[]>
  readonly pending: readonly Waypoint[]
}

const REACH_RANK: Readonly<Record<StemReach, number>> = { middle: 3, start: 2, end: 1, single: 0 }

const withPlacedRow = <Waypoint extends SpannedWaypoint>(
  { placed, pending }: Placement<Waypoint>,
  row: GutterRow<Waypoint>,
): Placement<Waypoint> => {
  if (row.kind === "waypoint") return { placed, pending: row.waypoint.lines === null ? pending : [...pending, row.waypoint] }
  if (row.kind === "gap") return { placed, pending: [] }
  const firstLine = row.lines.at(0)
  if (firstLine === undefined || pending.length === 0) return { placed, pending }
  return { placed: new Map([...placed, [firstLine, pending]]), pending: [] }
}

export const placeWaypoints = <Waypoint extends SpannedWaypoint>(
  rows: readonly GutterRow<Waypoint>[],
): ReadonlyMap<CodeLine, readonly Waypoint[]> =>
  rows.reduce<Placement<Waypoint>>(withPlacedRow, { placed: new Map(), pending: [] }).placed

export const lineSequenceOf = <Waypoint extends SpannedWaypoint>(rows: readonly GutterRow<Waypoint>[]): LineSlot[] =>
  rows.flatMap((row): LineSlot[] => {
    if (row.kind === "lines") return [...row.lines]
    return row.kind === "gap" ? [null] : []
  })

const spanEndOf = (sequence: readonly LineSlot[], start: number, lineEnd: number): number => {
  const following = sequence.slice(start)
  const breakOffset = following.indexOf(null)
  const run = breakOffset === -1 ? following : following.slice(0, breakOffset)
  const endOffset = run.findIndex((line) => line?.numberLabel === String(lineEnd))
  return start + (endOffset === -1 ? run.length - 1 : endOffset)
}

const reachOf = (index: number, start: number, end: number): StemReach => {
  if (start === end) return "single"
  if (index === start) return "start"
  return index === end ? "end" : "middle"
}

const pieceOf = (reach: StemReach, tone: StemTone): StemPiece => ({
  reach,
  isSolid: tone === "solid",
  isJoinedAbove: tone === "solid" && (reach === "start" || reach === "single"),
})

const isStronger = (candidate: StemPiece, current: StemPiece | undefined): boolean => {
  if (current === undefined) return true
  if (candidate.isSolid !== current.isSolid) return candidate.isSolid
  return REACH_RANK[candidate.reach] > REACH_RANK[current.reach]
}

export const stemsOf = <Waypoint extends SpannedWaypoint>(
  rows: readonly GutterRow<Waypoint>[],
  placed: ReadonlyMap<CodeLine, readonly Waypoint[]>,
  toneOf: (waypointId: string) => StemTone | null,
): ReadonlyMap<CodeLine, StemPiece> => {
  const sequence = lineSequenceOf(rows)
  const pieces = [...placed].flatMap(([firstLine, waypoints]) =>
    waypoints.flatMap((waypoint) => {
      const tone = toneOf(waypoint.id)
      if (tone === null || waypoint.lines === null) return []
      const start = sequence.indexOf(firstLine)
      const end = spanEndOf(sequence, start, waypoint.lines.lineEnd)
      return sequence
        .slice(start, end + 1)
        .flatMap((line, offset) => (line === null ? [] : [[line, pieceOf(reachOf(start + offset, start, end), tone)] as const]))
    }))
  return pieces.reduce<ReadonlyMap<CodeLine, StemPiece>>(
    (stems, [line, piece]) => (isStronger(piece, stems.get(line)) ? new Map([...stems, [line, piece]]) : stems),
    new Map(),
  )
}
