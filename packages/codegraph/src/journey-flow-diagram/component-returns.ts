import type { BaseASTGraphFile, Encapsulation, LineRange, SourceRange, Statement, StatementArm } from "@/ast-graph"
import { containsRange, joinAdjacentLines, linesOf, overlapsLines } from "@/ast-graph/source-range"
import type { ChangeType, ComponentReturn } from "@flightplan/configurations"
import { buildTracedLines } from "./traced-lines"

const BRANCHING_TYPES: ReadonlySet<Statement["type"]> = new Set<Statement["type"]>(["conditional", "loop", "try"])
const RETURN_TYPE: Statement["type"] = "return"
const RETURN_KEYWORD = "return"
const RETURN_ID_MARK = "#return@"
const FEWEST_RETURNS_SPLIT = 2
const DIFF: ChangeType = "diff"
const UNCHANGED: ChangeType = "none"

type Nesting = Pick<Statement, "statements" | "arms">

export interface RenderedUse {
  readonly nodeId: string
  readonly usedAt: SourceRange
}

export interface ReturningComponent {
  readonly file: BaseASTGraphFile
  readonly component: Encapsulation
  readonly nodeId: string
  readonly rendered: readonly RenderedUse[]
}

const listArms = ({ arms }: Pick<Nesting, "arms">): StatementArm[] => arms.flatMap((arm) => [arm, ...listArms(arm)])

const listBranchStatements = (holder: Nesting): Statement[] => [...holder.statements, ...listArms(holder).flatMap((arm) => arm.statements)]

const listOwnReturns = (statements: readonly Statement[]): Statement[] =>
  statements.flatMap((statement) => {
    if (statement.type === RETURN_TYPE) return [statement]
    return BRANCHING_TYPES.has(statement.type) ? listOwnReturns(listBranchStatements(statement)) : []
  })

const inSourceOrder = (statements: readonly Statement[]): Statement[] =>
  [...statements].sort((one, two) => one.range.start.line - two.range.start.line)

const inReadingOrder = (uses: readonly RenderedUse[]): RenderedUse[] =>
  [...uses].sort((one, two) => one.usedAt.start.line - two.usedAt.start.line || one.usedAt.start.column - two.usedAt.start.column)

const statementTextOf = (file: BaseASTGraphFile, { start }: SourceRange): string =>
  file.readLine(start.line).slice(0, start.column + RETURN_KEYWORD.length).trim()

const isWithinLines = ([startLine, endLine]: LineRange, ranges: readonly LineRange[]): boolean =>
  ranges.some(([rangeStart, rangeEnd]) => rangeStart <= startLine && endLine <= rangeEnd)

const isInDiff = (file: BaseASTGraphFile, range: SourceRange): boolean => file.listDiffLines().some((lines) => overlapsLines(range, lines))

const isWhollyNew = (file: BaseASTGraphFile, range: SourceRange): boolean => isWithinLines(linesOf(range), joinAdjacentLines(file.listDiffLines()))

const returnIdOf = (nodeId: string, { start }: SourceRange): string => `${nodeId}${RETURN_ID_MARK}${String(start.line)}`

const toComponentReturn = ({ file, component, nodeId, rendered }: ReturningComponent, { range }: Statement): ComponentReturn => {
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
  }
}

export const listComponentReturns = (returning: ReturningComponent): ComponentReturn[] => {
  const returns = inSourceOrder(listOwnReturns(returning.file.listStatements(returning.component)))
  return returns.length < FEWEST_RETURNS_SPLIT ? [] : returns.map((statement) => toComponentReturn(returning, statement))
}
