import type { SyntaxNode } from "@/ast-graph/parser"
import type { Position, SourceRange } from "@/ast-graph/types"

export interface Snippet {
  readonly code: string
  readonly start: Position
  readonly prefixLength: number
}

export interface Wrapping {
  readonly prefix: string
  readonly suffix: string
}

const FIRST_LINE = 1
const LINE_BREAK = "\n"
const UNWRAPPED: Wrapping = { prefix: "", suffix: "" }

export const positionWithin = (node: SyntaxNode, offset: number): Position => {
  const linesBefore = node.text.slice(0, offset).split(LINE_BREAK)
  const lastLine = linesBefore[linesBefore.length - 1]
  const lineBreaks = linesBefore.length - 1
  return {
    line: node.startPosition.row + FIRST_LINE + lineBreaks,
    column: lineBreaks === 0 ? node.startPosition.column + lastLine.length : lastLine.length,
  }
}

export const rangeWithin = (node: SyntaxNode, from: number, to: number): SourceRange => ({
  start: positionWithin(node, from),
  end: positionWithin(node, to),
})

export const snippetWithin = (node: SyntaxNode, from: number, to: number, { prefix, suffix }: Wrapping = UNWRAPPED): Snippet => ({
  code: `${prefix}${node.text.slice(from, to)}${suffix}`,
  start: positionWithin(node, from),
  prefixLength: prefix.length,
})

export const snippetOf = (node: SyntaxNode, wrapping: Wrapping = UNWRAPPED): Snippet => snippetWithin(node, 0, node.text.length, wrapping)

const placePosition = ({ start, prefixLength }: Snippet, { line, column }: Position): Position =>
  line === FIRST_LINE
    ? { line: start.line, column: Math.max(start.column, column - prefixLength + start.column) }
    : { line: line - FIRST_LINE + start.line, column }

export const placeRange
  = (snippet: Snippet) =>
    ({ start, end }: SourceRange): SourceRange => ({ start: placePosition(snippet, start), end: placePosition(snippet, end) })
