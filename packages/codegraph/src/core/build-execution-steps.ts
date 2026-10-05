import type { LanguageParser, Statement } from "./parsers"
import type { ExecutionStep } from "./types"

export interface BuildExecutionStepsInput {
  body: string
  locDiff: [number, number][]
  parser: LanguageParser
}

export async function buildExecutionSteps({
  body,
  locDiff,
  parser,
}: BuildExecutionStepsInput): Promise<ExecutionStep[]> {
  const statements = await parser.statements(body)
  return statements === null ? [] : stepsFrom(statements, locDiff)
}

function firstLine(text: string): string {
  return (text.split("\n")[0] ?? "").trim()
}

function overlaps(from: number, to: number, ranges: readonly [number, number][]): boolean {
  return ranges.some(([a, b]) => from <= b && to >= a)
}

function stepsFrom(statements: readonly Statement[], locDiff: readonly [number, number][]): ExecutionStep[] {
  return statements.flatMap((statement) => stepOf(statement, locDiff))
}

function stepOf(statement: Statement, locDiff: readonly [number, number][]): ExecutionStep[] {
  if (statement.type === "comment") return []
  return statement.arms.length > 0 ? branchingStepOf(statement, locDiff) : plainStepOf(statement, locDiff)
}

function plainStepOf(statement: Statement, locDiff: readonly [number, number][]): ExecutionStep[] {
  const { type, range } = statement
  const [from, to] = statement.lines
  return overlaps(from, to, locDiff) ? [{ line: from, text: firstLine(statement.text), range, type, changed: true }] : []
}

function branchingStepOf(statement: Statement, locDiff: readonly [number, number][]): ExecutionStep[] {
  const { type, range } = statement
  const [from, to] = statement.lines
  const arms = statement.arms
    .map((arm) => ({ label: arm.label, steps: stepsFrom(arm.statements, locDiff) }))
    .filter((arm) => arm.steps.length > 0)

  const armStarts = statement.arms.flatMap((arm) => arm.statements.map((one) => one.lines[0]))
  const headerTo = armStarts.length > 0 ? Math.max(from, Math.min(...armStarts) - 1) : to
  const isHeaderChanged = overlaps(from, headerTo, locDiff)

  if (arms.length === 0 && !isHeaderChanged) return []
  return [
    {
      line: from,
      text: firstLine(statement.text),
      range,
      type,
      changed: isHeaderChanged,
      ...(arms.length > 0 ? { branches: arms } : {}),
    },
  ]
}
