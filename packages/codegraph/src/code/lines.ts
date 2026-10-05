import type { LineRange, SourceFile, SourceLine } from "@/procedures/get-review/utils/review-artifact"
import type { CodeLine } from "@/procedures/get-review/utils/schemas"
import type { TokenLine } from "./highlighter"

export interface HighlightedSource {
  readonly source: SourceFile
  readonly tokenLines: readonly TokenLine[]
}

export interface RowSpan {
  readonly start: number
  readonly end: number
}

const NOT_FOUND = -1

const isInRange = (line: SourceLine, range: LineRange): boolean =>
  line.number !== null && line.number >= range.lineStart && line.number <= range.lineEnd

const firstRemovedRowBefore = (lines: readonly SourceLine[], index: number): number =>
  index > 0 && lines[index - 1]?.mark === "removed" ? firstRemovedRowBefore(lines, index - 1) : index

export const rowSpanOf = (source: SourceFile, range: LineRange): RowSpan | null => {
  const first = source.lines.findIndex((line) => isInRange(line, range))
  const last = source.lines.reduce((found, line, index) => (isInRange(line, range) ? index : found), NOT_FOUND)
  return first === NOT_FOUND ? null : { start: firstRemovedRowBefore(source.lines, first), end: last }
}

export const isInSpan = (index: number, span: RowSpan | null): boolean =>
  span !== null && index >= span.start && index <= span.end

const toCodeLine = (line: SourceLine, tokens: TokenLine, isFocused: boolean): CodeLine => ({
  numberLabel: line.number === null ? "" : String(line.number),
  mark: line.mark,
  isFocused,
  tokens: [...tokens],
})

export const codeLinesIn = (highlighted: HighlightedSource, span: RowSpan, focus: RowSpan | null): CodeLine[] =>
  highlighted.source.lines
    .map((line, index) => ({ line, index }))
    .filter(({ index }) => isInSpan(index, span))
    .map(({ line, index }) => toCodeLine(line, highlighted.tokenLines[index] ?? [], isInSpan(index, focus)))

export const findSource = (
  sources: readonly HighlightedSource[],
  path: string,
): HighlightedSource | null => sources.find((highlighted) => highlighted.source.path === path) ?? null
