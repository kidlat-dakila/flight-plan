import type { LineRange, Position, Statement, StatementArm } from "@/ast-graph"
import { containsPosition, overlapsLines } from "@/ast-graph/source-range"
import type { TracedLine } from "@flightplan/configurations"

export interface TracedTargets {
  readonly positions: readonly Position[]
  readonly lines: readonly LineRange[]
}

export interface TracedSource {
  readonly statements: readonly Statement[]
  readonly diffLines: readonly LineRange[]
  readonly readLine: (line: number) => string
}

type Nesting = Pick<Statement, "statements" | "arms">

const LINE_BEFORE = 1

const holdsStatement = (statement: Statement, { positions, lines }: TracedTargets): boolean =>
  positions.some((position) => containsPosition(statement.range, position)) || lines.some((range) => overlapsLines(statement.range, range))

const listNestedStatements = ({ statements, arms }: Nesting): Statement[] => [...statements, ...arms.flatMap(listNestedStatements)]

const listArms = ({ arms }: Pick<Nesting, "arms">): StatementArm[] => arms.flatMap((arm) => [arm, ...listArms(arm)])

const listSteppedInto = (holder: Nesting): Statement[] => {
  const nested = [...holder.statements, ...listArms(holder).flatMap((arm) => arm.statements)]
  return [...nested].sort((one, two) => one.range.start.line - two.range.start.line)
}

const linesBefore = (startLine: number, nested: readonly Statement[], endLine: number): LineRange => {
  const nestedStarts = nested.map((statement) => statement.range.start.line)
  if (nestedStarts.length === 0) return [startLine, endLine]
  return [startLine, Math.max(startLine, Math.min(...nestedStarts) - LINE_BEFORE)]
}

const headerLinesOf = (statement: Statement): LineRange =>
  linesBefore(statement.range.start.line, listNestedStatements(statement), statement.range.end.line)

const lineNumbersIn = ([startLine, endLine]: LineRange): number[] =>
  startLine > endLine ? [] : Array.from({ length: endLine - startLine + 1 }, (_line, offset) => startLine + offset)

const isInside = (line: number, statements: readonly Statement[]): boolean =>
  statements.some(({ range }) => range.start.line <= line && line <= range.end.line)

const armLinesAbove = (holder: Nesting, stepped: readonly Statement[]): number[] =>
  listArms(holder)
    .filter((arm) => arm.statements.some((statement) => stepped.includes(statement)))
    .flatMap((arm) => lineNumbersIn(linesBefore(arm.range.start.line, arm.statements, arm.range.start.line)))

const ownTargetLines = (statement: Statement, { positions, lines }: TracedTargets): number[] => {
  const nested = listNestedStatements(statement)
  const { start, end } = statement.range
  const targeted = [...positions.map((position) => position.line), ...lines.flatMap(lineNumbersIn)]
  return targeted.filter((line) => start.line <= line && line <= end.line && !isInside(line, nested))
}

function steppedLinesIn(holder: Nesting, targets: TracedTargets): number[] {
  const statements = listSteppedInto(holder)
  const lastIndex = statements.map((statement) => holdsStatement(statement, targets)).lastIndexOf(true)
  const stepped = statements.slice(0, lastIndex + 1)
  return [
    ...armLinesAbove(holder, stepped),
    ...stepped.flatMap((statement) => [
      ...lineNumbersIn(headerLinesOf(statement)),
      ...(holdsStatement(statement, targets) ? [...ownTargetLines(statement, targets), ...steppedLinesIn(statement, targets)] : []),
    ]),
  ]
}

const NO_ARMS: readonly StatementArm[] = []

export const listLinesOf = ({ diffLines, readLine }: Omit<TracedSource, "statements">, lineNumbers: readonly number[]): TracedLine[] =>
  [...new Set(lineNumbers)]
    .sort((one, two) => one - two)
    .map((line) => ({
      line,
      text: readLine(line).trimEnd(),
      isChanged: diffLines.some(([startLine, endLine]) => startLine <= line && line <= endLine),
    }))

export const buildTracedLines = (source: TracedSource, targets: TracedTargets): TracedLine[] =>
  listLinesOf(source, steppedLinesIn({ statements: source.statements, arms: NO_ARMS }, targets))

const findInnermost = (holder: Nesting, position: Position, type: Statement["type"]): Statement | null => {
  const containing = listSteppedInto(holder).filter((statement) => containsPosition(statement.range, position))
  return containing.reduce<Statement | null>((found, statement) => {
    const deeper = findInnermost(statement, position, type)
    return deeper ?? (statement.type === type ? statement : found)
  }, null)
}

export const findDeclarationAt = (statements: readonly Statement[], position: Position): Statement | null =>
  findInnermost({ statements, arms: NO_ARMS }, position, "declaration")

export const findMarkupAt = (statements: readonly Statement[], position: Position): Statement | null =>
  findInnermost({ statements, arms: NO_ARMS }, position, "markup")
