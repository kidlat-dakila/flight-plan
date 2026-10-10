import type { SyntaxNode } from "@/ast-graph/parser"
import type { Position, SourceRange } from "@/ast-graph/types"

const FIRST_LINE = 1
const LINE_BREAK = "\n"

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
