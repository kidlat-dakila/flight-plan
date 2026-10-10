import type { SyntaxNode, SyntaxPoint } from "@/ast-graph/parser"
import type { SourceRange as SyntaxRange } from "@/ast-graph/types"
import type { Position, SourceRange } from "./types"

export const FIRST_LINE = 1
export const FIRST_COLUMN = 1

const BEFORE = -1
const SAME = 0
const AFTER = 1

const positionOfPoint = ({ row, column }: SyntaxPoint): Position => ({ line: row + FIRST_LINE, column: column + FIRST_COLUMN })

export const rangeOfNode = (node: SyntaxNode): SourceRange => ({
  start: positionOfPoint(node.startPosition),
  end: positionOfPoint(node.endPosition),
})

export const fromSyntaxRange = ({ start, end }: SyntaxRange): SourceRange => ({
  start: { line: start.line, column: start.column + FIRST_COLUMN },
  end: { line: end.line, column: end.column + FIRST_COLUMN },
})

export const comparePositions = (one: Position, two: Position): number => {
  if (one.line !== two.line) return one.line < two.line ? BEFORE : AFTER
  if (one.column === two.column) return SAME
  return one.column < two.column ? BEFORE : AFTER
}

export const isBefore = (one: Position, two: Position): boolean => comparePositions(one, two) === BEFORE

export const containsPosition = (range: SourceRange, position: Position): boolean =>
  !isBefore(position, range.start) && !isBefore(range.end, position)

export const containsRange = (outer: SourceRange, inner: SourceRange): boolean =>
  containsPosition(outer, inner.start) && containsPosition(outer, inner.end)

export const isSameRange = (one: SourceRange, two: SourceRange): boolean => containsRange(one, two) && containsRange(two, one)

export const isEmptyRange = ({ start, end }: SourceRange): boolean => comparePositions(start, end) === SAME

export const touchesRange = (one: SourceRange, two: SourceRange): boolean => {
  if (isEmptyRange(one)) return containsPosition(two, one.start)
  if (isEmptyRange(two)) return containsPosition(one, two.start)
  return isBefore(one.start, two.end) && isBefore(two.start, one.end)
}

export const clipRange = (range: SourceRange, bounds: SourceRange): SourceRange => ({
  start: isBefore(range.start, bounds.start) ? bounds.start : range.start,
  end: isBefore(bounds.end, range.end) ? bounds.end : range.end,
})

export const positionKey = ({ line, column }: Position): string => `${String(line)}:${String(column)}`

export const rangeKey = ({ start, end }: SourceRange): string => `${positionKey(start)}-${positionKey(end)}`

export const compareRanges = (one: SourceRange, two: SourceRange): number =>
  comparePositions(one.start, two.start) || comparePositions(two.end, one.end)
