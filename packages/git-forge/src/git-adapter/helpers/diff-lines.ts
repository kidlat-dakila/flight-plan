import type { DiffPosition, DiffSide } from "@/git-adapter/types"
import { splitDiff } from "./diff"

export interface DiffLine {
  readonly oldLine: number | null
  readonly newLine: number | null
  readonly oldCursor: number
  readonly newCursor: number
}

interface PatchReading {
  readonly lines: readonly DiffLine[]
  readonly oldCursor: number
  readonly newCursor: number
  readonly isInHunk: boolean
}

const HUNK_HEADER_PATTERN = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/
const ADDED_PREFIX = "+"
const REMOVED_PREFIX = "-"
const CONTEXT_PREFIX = " "
const LINE_BREAK = "\n"
const BEFORE_FIRST_HUNK: PatchReading = { lines: [], oldCursor: 0, newCursor: 0, isInHunk: false }

function readPatchLine(reading: PatchReading, text: string): PatchReading {
  const header = HUNK_HEADER_PATTERN.exec(text)
  if (header !== null) {
    return { ...reading, oldCursor: Number(header[1]), newCursor: Number(header[2]), isInHunk: true }
  }
  if (!reading.isInHunk) return reading
  const { oldCursor, newCursor } = reading
  if (text.startsWith(ADDED_PREFIX)) {
    return { ...reading, lines: [...reading.lines, { oldLine: null, newLine: newCursor, oldCursor, newCursor }], newCursor: newCursor + 1 }
  }
  if (text.startsWith(REMOVED_PREFIX)) {
    return { ...reading, lines: [...reading.lines, { oldLine: oldCursor, newLine: null, oldCursor, newCursor }], oldCursor: oldCursor + 1 }
  }
  if (!text.startsWith(CONTEXT_PREFIX)) return reading
  return {
    ...reading,
    lines: [...reading.lines, { oldLine: oldCursor, newLine: newCursor, oldCursor, newCursor }],
    oldCursor: oldCursor + 1,
    newCursor: newCursor + 1,
  }
}

export function diffLinesOf(patch: string): DiffLine[] {
  return [...patch.split(LINE_BREAK).reduce(readPatchLine, BEFORE_FIRST_HUNK).lines]
}

export function findDiffLine(lines: readonly DiffLine[], side: DiffSide, line: number): DiffLine | null {
  return lines.find((candidate) => (side === "old" ? candidate.oldLine : candidate.newLine) === line) ?? null
}

export function diffLinesByPath(diff: string): Map<string, DiffLine[]> {
  return new Map(splitDiff(diff).map((file) => [file.path, diffLinesOf(file.patch ?? "")]))
}

export interface PositionEnds {
  readonly start: DiffLine
  readonly end: DiffLine
}

export function findPositionEnds(linesByPath: ReadonlyMap<string, readonly DiffLine[]>, position: DiffPosition): PositionEnds | null {
  const lines = linesByPath.get(position.path) ?? []
  const start = findDiffLine(lines, position.side, position.startLine)
  const end = findDiffLine(lines, position.side, position.endLine)
  return start === null || end === null ? null : { start, end }
}

export function isInDiff(diff: string, position: DiffPosition): boolean {
  return findPositionEnds(diffLinesByPath(diff), position) !== null
}
