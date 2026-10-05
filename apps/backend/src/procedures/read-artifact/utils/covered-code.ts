import { rowSpanOf, type RowSpan } from "@/procedures/get-review/utils/code/lines"
import { lastOf } from "@/procedures/get-review/utils/last-of"
import type { LineMark, LineRange, SourceFile, SourceLine } from "@/procedures/get-review/utils/review-artifact"

export interface CoveredCode {
  readonly path: string
  readonly lineStart: number
  readonly lineEnd: number
  readonly change: "changed" | "unchanged"
  readonly text: string
  readonly omittedLineCount: number
}

const MARK_PREFIXES: Readonly<Record<LineMark, string>> = { context: " ", added: "+", removed: "-" }
const NUMBER_SEPARATOR = "\t"
const LINE_BREAK = "\n"
const UNCHANGED_MARK: LineMark = "context"

const formatLine = (line: SourceLine): string =>
  `${MARK_PREFIXES[line.mark]}${line.number === null ? "" : String(line.number)}${NUMBER_SEPARATOR}${line.text}`

const rowsIn = (source: SourceFile, span: RowSpan): SourceLine[] => source.lines.slice(span.start, span.end + 1)

export const formatRows = (source: SourceFile, span: RowSpan): string =>
  rowsIn(source, span).map(formatLine).join(LINE_BREAK)

export const rangeOfDeclaration = (source: SourceFile, declaration: string): LineRange | null =>
  Object.keys(source.declarations).includes(declaration) ? source.declarations[declaration] : null

export const coverCode = (
  sources: readonly SourceFile[],
  path: string,
  declaration: string,
  maxLineCount: number,
): CoveredCode | null => {
  const source = sources.find((candidate) => candidate.path === path)
  const range = source === undefined ? null : rangeOfDeclaration(source, declaration)
  const span = source === undefined || range === null ? null : rowSpanOf(source, range)
  if (source === undefined || range === null || span === null) return null
  const rows = rowsIn(source, span)
  return {
    path,
    lineStart: range.lineStart,
    lineEnd: range.lineEnd,
    change: rows.some((line) => line.mark !== UNCHANGED_MARK) ? "changed" : "unchanged",
    text: rows.slice(0, maxLineCount).map(formatLine).join(LINE_BREAK),
    omittedLineCount: Math.max(0, rows.length - maxLineCount),
  }
}

const withRow = (spans: readonly RowSpan[], row: number, contextRowCount: number, lastRow: number): RowSpan[] => {
  const span = { start: Math.max(0, row - contextRowCount), end: Math.min(lastRow, row + contextRowCount) }
  const previous = lastOf(spans)
  return previous !== undefined && span.start <= previous.end + 1
    ? [...spans.slice(0, -1), { start: previous.start, end: Math.max(previous.end, span.end) }]
    : [...spans, span]
}

export const changedHunksOf = (source: SourceFile, contextRowCount: number): string[] =>
  source.lines
    .flatMap((line, row) => (line.mark === UNCHANGED_MARK ? [] : [row]))
    .reduce<RowSpan[]>((spans, row) => withRow(spans, row, contextRowCount, source.lines.length - 1), [])
    .map((span) => formatRows(source, span))
