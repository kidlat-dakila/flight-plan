import type { DiffType } from "@flightplan/configurations"

export interface FileChange {
  readonly path: string
  readonly kind: DiffType
  readonly addedCount: number
  readonly removedCount: number
}

const LINE_BREAK = "\n"
const FILE_HEADER_PREFIX = "diff --git "
const HUNK_PREFIX = "@@"
const NEW_FILE_PREFIX = "new file mode"
const DELETED_FILE_PREFIX = "deleted file mode"
const ADDED_LINE_PREFIX = "+"
const REMOVED_LINE_PREFIX = "-"
const QUOTE = "\""
const PLAIN_SIDE_PREFIX_LENGTH = "a/".length
const PLAIN_SIDES_EXTRA_LENGTH = "a/ b/".length
const QUOTED_SIDE_PREFIX_LENGTH = "\"a/".length
const QUOTED_SIDES_EXTRA_LENGTH = "\"a/\" \"b/\"".length
const SIDE_COUNT = 2

const sectionsOf = (lines: readonly string[]): readonly (readonly string[])[] => {
  const starts = lines.flatMap((line, index) => (line.startsWith(FILE_HEADER_PREFIX) ? [index] : []))
  return starts.map((start, position) => lines.slice(start, starts.at(position + 1) ?? lines.length))
}

const pathOfSides = (sides: string): string => {
  const [prefixLength, extraLength] = sides.startsWith(QUOTE)
    ? [QUOTED_SIDE_PREFIX_LENGTH, QUOTED_SIDES_EXTRA_LENGTH]
    : [PLAIN_SIDE_PREFIX_LENGTH, PLAIN_SIDES_EXTRA_LENGTH]
  return sides.slice(prefixLength, prefixLength + (sides.length - extraLength) / SIDE_COUNT)
}

const kindOf = (headerLines: readonly string[]): DiffType => {
  if (headerLines.some((line) => line.startsWith(NEW_FILE_PREFIX))) return "added"
  return headerLines.some((line) => line.startsWith(DELETED_FILE_PREFIX)) ? "deleted" : "modified"
}

const countStartingWith = (lines: readonly string[], prefix: string): number =>
  lines.filter((line) => line.startsWith(prefix)).length

const toFileChange = ([header, ...rest]: readonly string[]): FileChange => {
  const hunkStart = rest.findIndex((line) => line.startsWith(HUNK_PREFIX))
  const headerLines = hunkStart === -1 ? rest : rest.slice(0, hunkStart)
  const hunkLines = hunkStart === -1 ? [] : rest.slice(hunkStart)
  return {
    path: pathOfSides(header.slice(FILE_HEADER_PREFIX.length)),
    kind: kindOf(headerLines),
    addedCount: countStartingWith(hunkLines, ADDED_LINE_PREFIX),
    removedCount: countStartingWith(hunkLines, REMOVED_LINE_PREFIX),
  }
}

export const fileChangesOf = (diff: string): readonly FileChange[] => sectionsOf(diff.split(LINE_BREAK)).map(toFileChange)
