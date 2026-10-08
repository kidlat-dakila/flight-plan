import type { BaseASTGraphFile, Encapsulation, FilesByPath, LineRange, SourceRange, Statement } from "@/ast-graph"
import { containsRange, joinAdjacentLines, linesOf, overlapsLines } from "@/ast-graph/source-range"
import type { ChangeType, ComponentReturn } from "@flightplan/configurations"
import { listComponentViews } from "./code-views"
import { listReturnStatements } from "./return-statements"
import { buildTracedLines } from "./traced-lines"

const RETURN_KEYWORD = "return"
const RETURN_ID_MARK = "#return@"
const FEWEST_RETURNS_SPLIT = 2
const DIFF: ChangeType = "diff"
const UNCHANGED: ChangeType = "none"

export interface RenderedUse {
  readonly nodeId: string
  readonly usedAt: SourceRange
}

export interface ReturningComponent {
  readonly files: FilesByPath
  readonly file: BaseASTGraphFile
  readonly component: Encapsulation
  readonly nodeId: string
  readonly rendered: readonly RenderedUse[]
}

const inReadingOrder = (uses: readonly RenderedUse[]): RenderedUse[] =>
  [...uses].sort((one, two) => one.usedAt.start.line - two.usedAt.start.line || one.usedAt.start.column - two.usedAt.start.column)

const statementTextOf = (file: BaseASTGraphFile, { start }: SourceRange): string =>
  file.readLine(start.line).slice(0, start.column + RETURN_KEYWORD.length).trim()

const isWithinLines = ([startLine, endLine]: LineRange, ranges: readonly LineRange[]): boolean =>
  ranges.some(([rangeStart, rangeEnd]) => rangeStart <= startLine && endLine <= rangeEnd)

const isInDiff = (file: BaseASTGraphFile, range: SourceRange): boolean => file.listDiffLines().some((lines) => overlapsLines(range, lines))

const isWhollyNew = (file: BaseASTGraphFile, range: SourceRange): boolean => isWithinLines(linesOf(range), joinAdjacentLines(file.listDiffLines()))

const returnIdOf = (nodeId: string, { start }: SourceRange): string => `${nodeId}${RETURN_ID_MARK}${String(start.line)}`

const toComponentReturn = ({ files, file, component, nodeId, rendered }: ReturningComponent, { range }: Statement): ComponentReturn => {
  const isChanged = isInDiff(file, range)
  return {
    id: returnIdOf(nodeId, range),
    statement: statementTextOf(file, range),
    reference: linesOf(range),
    changeType: isChanged ? DIFF : UNCHANGED,
    isAdded: isChanged && isWhollyNew(file, range),
    label: null,
    description: null,
    tracedLines: buildTracedLines(
      { statements: file.listStatements(component), diffLines: file.listDiffLines(), readLine: (line) => file.readLine(line) },
      { positions: [], lines: [linesOf(range)] },
    ),
    renderedNodeIds: [...new Set(inReadingOrder(rendered.filter(({ usedAt }) => containsRange(range, usedAt))).map((use) => use.nodeId))],
    codeViews: listComponentViews({ files, file, component }, range),
  }
}

export const listComponentReturns = (returning: ReturningComponent): ComponentReturn[] => {
  const returns = listReturnStatements(returning.file, returning.component)
  return returns.length < FEWEST_RETURNS_SPLIT ? [] : returns.map((statement) => toComponentReturn(returning, statement))
}
