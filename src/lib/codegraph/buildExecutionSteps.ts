/**
 * Builds the execution-step tree for one function body, restricted to the change.
 *
 * Language-agnostic: it walks statements the {@link LanguageParser} hands back,
 * keeps only the steps the change reaches (a straight-line step when its lines
 * fall within `locDiff`; a branching step when an arm survives, so the branch
 * stays as the spine down to the change), and marks the steps the diff touched.
 * Every language detail — what a body is, a statement's kind, its arms — comes
 * from the parser as {@link Statement}s; nothing here names a syntax node.
 *
 * Line numbers are **body-relative** (1-based from the first line of `body`).
 */
import type { LanguageParser, Statement } from "./parsers/index"
import type { ExecutionStep } from "./types"

export type BuildExecutionStepsInput = {
  /** The source of the function body (its whole `enclosingRange`). */
  body: string
  /** Changed line ranges inside the body, `[from, to]` inclusive, 1-based. */
  locDiff: [number, number][]
  /** The parser for the body's language. */
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

/** Build steps for a run of statements, pruned to what the change reaches. */
function stepsFrom(statements: readonly Statement[], locDiff: readonly [number, number][]): ExecutionStep[] {
  const steps: ExecutionStep[] = []
  for (const statement of statements) {
    const { type, range } = statement
    if (type === "comment") continue
    const [from, to] = statement.lines

    if (statement.arms.length > 0) {
      const arms = statement.arms
        .map((arm) => ({ label: arm.label, steps: stepsFrom(arm.statements, locDiff) }))
        .filter((arm) => arm.steps.length > 0)

      // The header is the statement's own lines, up to where its first arm starts.
      const armStarts = statement.arms.flatMap((arm) => arm.statements.map((one) => one.lines[0]))
      const headerTo = armStarts.length > 0 ? Math.max(from, Math.min(...armStarts) - 1) : to
      const headerChanged = overlaps(from, headerTo, locDiff)

      if (arms.length === 0 && !headerChanged) continue
      steps.push({
        line: from,
        text: firstLine(statement.text),
        range,
        type,
        changed: headerChanged,
        ...(arms.length > 0 ? { branches: arms } : {}),
      })
    } else {
      if (!overlaps(from, to, locDiff)) continue
      steps.push({ line: from, text: firstLine(statement.text), range, type, changed: true })
    }
  }
  return steps
}
