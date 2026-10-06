import type { LineRange } from "@/ast-graph"

interface PatchReading {
  readonly line: number
  readonly lines: readonly number[]
  readonly isRemoving: boolean
}

const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(?<newStart>\d+)(?:,(?<newCount>\d+))?/
const HUNK_PREFIX = "@@"
const ADDED_PREFIX = "+"
const REMOVED_PREFIX = "-"
const NO_NEWLINE_PREFIX = "\\"
const LINE_BREAK = "\n"
const EMPTY_COUNT = "0"
const FIRST_LINE = 1
const UNPLACED_LINE = 0

const NOTHING_READ: PatchReading = { line: UNPLACED_LINE, lines: [], isRemoving: false }

const firstLineOf = (header: string): number => {
  const groups = HUNK_HEADER_PATTERN.exec(header)?.groups
  if (groups === undefined) return UNPLACED_LINE
  const newStart = Number(groups.newStart)
  return groups.newCount === EMPTY_COUNT ? newStart + 1 : newStart
}

const withRemovalPlaced = (reading: PatchReading): PatchReading =>
  reading.isRemoving
    ? { ...reading, lines: [...reading.lines, Math.max(FIRST_LINE, reading.line - 1)], isRemoving: false }
    : reading

const withPatchLine = (reading: PatchReading, raw: string): PatchReading => {
  if (raw.startsWith(HUNK_PREFIX)) return { ...withRemovalPlaced(reading), line: firstLineOf(raw) }
  if (reading.line === UNPLACED_LINE || raw.startsWith(NO_NEWLINE_PREFIX)) return reading
  if (raw.startsWith(ADDED_PREFIX)) return { line: reading.line + 1, lines: [...reading.lines, reading.line], isRemoving: false }
  if (raw.startsWith(REMOVED_PREFIX)) return { ...reading, isRemoving: true }
  const placed = withRemovalPlaced(reading)
  return { ...placed, line: placed.line + 1 }
}

const joinLine = (ranges: readonly LineRange[], line: number): readonly LineRange[] => {
  if (ranges.length === 0) return [[line, line]]
  const last = ranges[ranges.length - 1]
  if (line > last[1] + 1) return [...ranges, [line, line]]
  return [...ranges.slice(0, -1), [last[0], Math.max(last[1], line)]]
}

export const diffLinesOf = (patch: string): LineRange[] => {
  const { lines } = withRemovalPlaced(patch.split(LINE_BREAK).reduce(withPatchLine, NOTHING_READ))
  return [...[...new Set(lines)].sort((one, two) => one - two).reduce(joinLine, [])]
}
