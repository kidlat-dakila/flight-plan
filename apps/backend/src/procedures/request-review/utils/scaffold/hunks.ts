import type { LineRange } from "@/procedures/get-review/utils/review-artifact"

export interface Removal {
  readonly afterLine: number
  readonly lines: readonly string[]
}

export interface Hunk {
  readonly added: readonly LineRange[]
  readonly removed: readonly Removal[]
  readonly isCreated: boolean
}

export type HunksByPath = Readonly<Record<string, Hunk>>

interface DiffReading {
  readonly hunks: HunksByPath
  readonly path: string | null
  readonly line: number
  readonly run: LineRange | null
  readonly deleted: readonly string[]
  readonly isSkippingLine: boolean
}

const HUNK_HEADER_PATTERN = /^@@ -\d+(?:,\d+)? \+(?<newStart>\d+)(?:,(?<newCount>\d+))?/
const OLD_FILE_PREFIX = "--- "
const NEW_FILE_PREFIX = "+++ "
const HUNK_PREFIX = "@@"
const ADDED_PREFIX = "+"
const REMOVED_PREFIX = "-"
const NO_NEWLINE_PREFIX = "\\"
const NO_FILE = "/dev/null"
const HEADER_PREFIX_LENGTH = 4
const SIDE_PREFIX_LENGTH = 2
const LINE_BREAK = "\n"
const UNPLACED_LINE = 0

const EMPTY_HUNK: Hunk = { added: [], removed: [], isCreated: false }

const NOTHING_READ: DiffReading = {
  hunks: {},
  path: null,
  line: UNPLACED_LINE,
  run: null,
  deleted: [],
  isSkippingLine: false,
}

const headerPathOf = (header: string, sidePrefix: string): string | null => {
  const target = header.slice(HEADER_PREFIX_LENGTH).trim()
  if (target === NO_FILE) return null
  return target.startsWith(sidePrefix) ? target.slice(SIDE_PREFIX_LENGTH) : target
}

const hunkOf = (reading: DiffReading, path: string): Hunk =>
  Object.entries(reading.hunks).find(([hunkPath]) => hunkPath === path)?.[1] ?? EMPTY_HUNK

const withHunk = (reading: DiffReading, path: string, change: (hunk: Hunk) => Hunk): DiffReading => ({
  ...reading,
  hunks: { ...reading.hunks, [path]: change(hunkOf(reading, path)) },
})

const flushRun = (reading: DiffReading): DiffReading => {
  const { run, path } = reading
  if (run === null || path === null) return { ...reading, run: null }
  return { ...withHunk(reading, path, (hunk) => ({ ...hunk, added: [...hunk.added, run] })), run: null }
}

const flushDeleted = (reading: DiffReading): DiffReading => {
  const { deleted, path, line } = reading
  if (deleted.length === 0 || path === null) return { ...reading, deleted: [] }
  const removal: Removal = { afterLine: line - 1, lines: deleted }
  return { ...withHunk(reading, path, (hunk) => ({ ...hunk, removed: [...hunk.removed, removal] })), deleted: [] }
}

const flush = (reading: DiffReading): DiffReading => flushDeleted(flushRun(reading))

const withFileOpened = (reading: DiffReading, oldHeader: string, newHeader: string): DiffReading => {
  const flushed = flush(reading)
  const path = headerPathOf(newHeader, "b/")
  const isCreated = path !== null && headerPathOf(oldHeader, "a/") === null
  const opened = { ...flushed, path, line: UNPLACED_LINE, isSkippingLine: true }
  return path !== null && isCreated ? withHunk(opened, path, () => ({ ...EMPTY_HUNK, isCreated: true })) : opened
}

const firstLineOf = (header: string): number => {
  const groups = HUNK_HEADER_PATTERN.exec(header)?.groups
  if (groups === undefined) return UNPLACED_LINE
  const newStart = Number(groups.newStart)
  return groups.newCount === "0" ? newStart + 1 : newStart
}

const withAddedLine = (reading: DiffReading): DiffReading => {
  const flushed = flushDeleted(reading)
  const { run, line } = flushed
  const extended = run !== null && run.lineEnd === line - 1
    ? { ...flushed, run: { ...run, lineEnd: line } }
    : { ...flushRun(flushed), run: { lineStart: line, lineEnd: line } }
  return { ...extended, line: line + 1 }
}

const withDiffLine = (reading: DiffReading, raw: string, next: string | undefined): DiffReading => {
  if (reading.isSkippingLine) return { ...reading, isSkippingLine: false }
  if (raw.startsWith(OLD_FILE_PREFIX) && next?.startsWith(NEW_FILE_PREFIX) === true) return withFileOpened(reading, raw, next)
  if (raw.startsWith(HUNK_PREFIX)) return { ...flush(reading), line: firstLineOf(raw) }
  if (reading.path === null || reading.line === UNPLACED_LINE) return reading
  if (raw.startsWith(ADDED_PREFIX)) return withAddedLine(reading)
  if (raw.startsWith(REMOVED_PREFIX)) return { ...flushRun(reading), deleted: [...reading.deleted, raw.slice(1)] }
  if (raw.startsWith(NO_NEWLINE_PREFIX)) return reading
  const flushed = flush(reading)
  return { ...flushed, line: flushed.line + 1 }
}

export const parseHunks = (diff: string): HunksByPath => {
  const lines = diff.split(LINE_BREAK)
  return flush(lines.reduce((reading, raw, index) => withDiffLine(reading, raw, lines[index + 1]), NOTHING_READ)).hunks
}
