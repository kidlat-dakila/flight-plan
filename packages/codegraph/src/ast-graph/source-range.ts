import type { SyntaxNode, SyntaxPoint } from "./parser"
import type { LineRange, Position, SourceRange } from "./types"

const FIRST_LINE = 1

const positionOf = ({ row, column }: SyntaxPoint): Position => ({ line: row + FIRST_LINE, column })

export const rangeOf = (node: SyntaxNode): SourceRange => ({
  start: positionOf(node.startPosition),
  end: positionOf(node.endPosition),
})

const isAtOrAfter = (position: Position, other: Position): boolean =>
  position.line > other.line || (position.line === other.line && position.column >= other.column)

export const containsPosition = (range: SourceRange, position: Position): boolean =>
  isAtOrAfter(position, range.start) && isAtOrAfter(range.end, position)

export const containsRange = (outer: SourceRange, inner: SourceRange): boolean =>
  containsPosition(outer, inner.start) && containsPosition(outer, inner.end)

export const containsLines = (range: SourceRange, [startLine, endLine]: LineRange): boolean =>
  range.start.line <= startLine && endLine <= range.end.line

export const clipLines = (range: SourceRange, [startLine, endLine]: LineRange): LineRange | null => {
  const clipped: LineRange = [Math.max(startLine, range.start.line), Math.min(endLine, range.end.line)]
  return clipped[0] <= clipped[1] ? clipped : null
}

export const isSameRange = (one: SourceRange, two: SourceRange): boolean =>
  containsRange(one, two) && containsRange(two, one)

export const positionKey = ({ line, column }: Position): string => [line, column].join(":")
