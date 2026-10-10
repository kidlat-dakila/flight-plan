import { FIRST_COLUMN } from "./source-range"
import type { SourceRange } from "./types"

interface AddedLine {
  readonly line: number
  readonly text: string
}

interface PatchReading {
  readonly line: number
  readonly removed: readonly string[]
  readonly added: readonly AddedLine[]
  readonly ranges: readonly SourceRange[]
}

const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(?<newStart>\d+)(?:,(?<newCount>\d+))?/
const HUNK_PREFIX = "@@"
const ADDED_PREFIX = "+"
const REMOVED_PREFIX = "-"
const NO_NEWLINE_PREFIX = "\\"
const LINE_BREAK = "\n"
const EMPTY_COUNT = "0"
const UNPLACED_LINE = 0
const MARKER_LENGTH = 1
const BLANK_PATTERN = /^\s*$/
const LEADING_BLANK_PATTERN = /^\s*/

const NOTHING_READ: PatchReading = { line: UNPLACED_LINE, removed: [], added: [], ranges: [] }

const firstLineOf = (header: string): number => {
  const groups = HUNK_HEADER_PATTERN.exec(header)?.groups
  if (groups === undefined) return UNPLACED_LINE
  const newStart = Number(groups.newStart)
  return groups.newCount === EMPTY_COUNT ? newStart + 1 : newStart
}

const rangeIn = (line: number, startIndex: number, endIndex: number): SourceRange => ({
  start: { line, column: startIndex + FIRST_COLUMN },
  end: { line, column: endIndex + FIRST_COLUMN },
})

const positionAt = (line: number, index = 0): SourceRange => rangeIn(line, index, index)

type CharacterAt = (text: string, offset: number) => string

const fromStart: CharacterAt = (text, offset) => text.charAt(offset)

const fromEnd: CharacterAt = (text, offset) => text.charAt(text.length - 1 - offset)

const sharedLength = (one: string, two: string, characterAt: CharacterAt): number => {
  const longest = Math.min(one.length, two.length)
  const firstDifference = Array.from({ length: longest }, (_unused, offset) => offset).find((offset) => characterAt(one, offset) !== characterAt(two, offset))
  return firstDifference ?? longest
}

const wholeLineOf = ({ line, text }: AddedLine): SourceRange[] => {
  if (BLANK_PATTERN.test(text)) return []
  const startIndex = LEADING_BLANK_PATTERN.exec(text)?.[0].length ?? 0
  return [rangeIn(line, startIndex, text.trimEnd().length)]
}

const replacedPartOf = (old: string, { line, text }: AddedLine): SourceRange => {
  const startLength = sharedLength(old, text, fromStart)
  const endLength = sharedLength(old.slice(startLength), text.slice(startLength), fromEnd)
  return rangeIn(line, startLength, text.length - endLength)
}

const rangesOfRun = ({ line, removed, added }: PatchReading): SourceRange[] => {
  if (removed.length === 0) return added.flatMap(wholeLineOf)
  if (added.length === 0) return [positionAt(line)]
  if (removed.length !== added.length) return added.flatMap(wholeLineOf)
  return added.map((addedLine, index) => replacedPartOf(removed[index], addedLine))
}

const withRunPlaced = (reading: PatchReading): PatchReading => ({
  line: reading.line,
  removed: [],
  added: [],
  ranges: [...reading.ranges, ...rangesOfRun(reading)],
})

const withPatchLine = (reading: PatchReading, raw: string): PatchReading => {
  if (raw.startsWith(HUNK_PREFIX)) return { ...withRunPlaced(reading), line: firstLineOf(raw) }
  if (reading.line === UNPLACED_LINE || raw.startsWith(NO_NEWLINE_PREFIX)) return reading
  const text = raw.slice(MARKER_LENGTH)
  if (raw.startsWith(ADDED_PREFIX)) return { ...reading, line: reading.line + 1, added: [...reading.added, { line: reading.line, text }] }
  if (raw.startsWith(REMOVED_PREFIX)) return reading.added.length > 0 ? { ...withRunPlaced(reading), removed: [text] } : { ...reading, removed: [...reading.removed, text] }
  const placed = withRunPlaced(reading)
  return { ...placed, line: placed.line + 1 }
}

export const diffRangesOf = (patch: string): SourceRange[] => [
  ...withRunPlaced(patch.split(LINE_BREAK).reduce(withPatchLine, NOTHING_READ)).ranges,
]
