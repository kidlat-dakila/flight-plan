import { compareRanges } from "@/code-blocks/source-range"
import { nameOfBlock } from "@/journey/names"
import { isBodyBlock, isFoldedValue, isNodeBlock } from "@/journey-flow-diagram/node-blocks"
import {
  callsCodeOutside,
  holderOf,
  isChanged,
  isControlBlock,
  isNamedFunction,
  isStepRow,
  isWithin,
  listRuns,
  nameOfRun,
  statementOf,
  type StepCandidate,
  type StepFolding,
  type StepRules,
} from "@/journey-flow-diagram/step-folding"
import type { CodeBlock, CodeBlockType } from "@flightplan/configurations"

export interface WaypointStep {
  readonly name: string
  readonly lines: readonly [number, number]
  readonly blocks: readonly CodeBlock[]
  readonly children: readonly WaypointStep[]
}

interface Run {
  readonly statements: readonly CodeBlock[]
  readonly name: string
  readonly holderId: string | null
}

const MARKUP_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-root", "render"])
const EXPRESSION_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-condition", "render-loop", "render-event"])
const UNLISTED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["root-argument-value"])
const READ_WHOLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>([
  "function",
  "hook",
  "component",
  "method",
  "condition",
  "loop",
  "switch",
  "switch-case",
  "render-condition",
  "render-loop",
])
const READ_IN_PARTS_LINE_COUNT = 6

const isExpression = (block: CodeBlock): boolean => EXPRESSION_TYPES.has(block.type)

const inWrittenOrder = (blocks: readonly CodeBlock[]): CodeBlock[] =>
  [...blocks].sort((one, two) => compareRanges(one.lineOfCodeRangeReference[0], two.lineOfCodeRangeReference[0]))

const listDescendants = (block: CodeBlock): CodeBlock[] => block.childrenBlocks.flatMap((child) => [child, ...listDescendants(child)])

const expressionOf = (block: CodeBlock, declarationBlock: CodeBlock): CodeBlock | null => {
  if (isExpression(block)) return block
  const around = block.parentBlock
  return around === null || around.id === declarationBlock.id ? null : expressionOf(around, declarationBlock)
}

const stepBlockOf = (block: CodeBlock, declarationBlock: CodeBlock): CodeBlock | null => {
  const expression = expressionOf(block, declarationBlock)
  if (expression !== null) return expression
  if (MARKUP_TYPES.has(block.type) || UNLISTED_TYPES.has(block.type)) return null
  return isBodyBlock(block) ? block.parentBlock : statementOf(block, declarationBlock)
}

const isOutsideOf = (block: CodeBlock, declarationBlock: CodeBlock): boolean => block.id !== declarationBlock.id && !isWithin(block, declarationBlock)

const firstLineOf = (block: CodeBlock): number => block.lineOfCodeRangeReference[0].start.line

const lastLineOf = (block: CodeBlock): number => Math.max(...block.lineOfCodeRangeReference.map((range) => range.end.line))

const listChangedLines = (blocks: readonly CodeBlock[]): ReadonlySet<number> =>
  new Set(
    blocks.flatMap((block) => block.lineOfCodeDiffs ?? []).flatMap(({ start, end }) => Array.from({ length: end.line - start.line + 1 }, (_line, index) => start.line + index)),
  )

const rulesOf = (declarationBlock: CodeBlock, changedLines: ReadonlySet<number>): StepRules => ({
  holdsSteps: (block) => isControlBlock(block) || isExpression(block),
  holdsBody: (block) => !isExpression(block) && (isNamedFunction(block) || isNodeBlock(block) || isFoldedValue(block)),
  leadsOut: (block) => block.nextBlocks.some((next) => isOutsideOf(next, declarationBlock)) || callsCodeOutside(block, (called) => isOutsideOf(called, declarationBlock)),
  isFollowing: (earlier, later) =>
    Array.from({ length: Math.max(firstLineOf(later) - lastLineOf(earlier) - 1, 0) }, (_line, index) => lastLineOf(earlier) + 1 + index).every((line) => changedLines.has(line)),
})

const lineCountOf = ([startLine, endLine]: readonly [number, number]): number => endLine - startLine + 1

const isReadWhole = (block: CodeBlock, lines: readonly [number, number]): boolean =>
  READ_WHOLE_TYPES.has(block.type) && lineCountOf(lines) < READ_IN_PARTS_LINE_COUNT

const toStep = (run: Run, runs: readonly Run[], changedBlocks: readonly CodeBlock[]): WaypointStep => {
  const { statements, name } = run
  const folded = changedBlocks.filter((block) => statements.some((statement) => isWithin(block, statement)))
  const lines: [number, number] = [Math.min(...statements.map(firstLineOf)), Math.max(...statements.map(lastLineOf))]
  const isWhole = statements.length === 1 && isReadWhole(statements[0], lines)
  return {
    name,
    lines,
    blocks: inWrittenOrder([...new Set([...statements, ...folded])]),
    children: isWhole ? [] : listStepsHeldBy(statements[0].id, runs, changedBlocks),
  }
}

const withoutLoneStep = (steps: readonly WaypointStep[]): readonly WaypointStep[] => (steps.length === 1 ? withoutLoneStep(steps[0].children) : steps)

const listStepsHeldBy = (holderId: string | null, runs: readonly Run[], changedBlocks: readonly CodeBlock[]): readonly WaypointStep[] =>
  withoutLoneStep(runs.filter((run) => run.holderId === holderId).map((run) => toStep(run, runs, changedBlocks)))

const startLineOf = (step: WaypointStep): number => step.lines[0]

const liftStepsStartingOn = (line: number, steps: readonly WaypointStep[]): WaypointStep[] =>
  steps.flatMap((step) => (startLineOf(step) === line ? liftStepsStartingOn(line, step.children) : [step]))

const joinSteps = (earlier: WaypointStep, later: WaypointStep): WaypointStep => ({
  name: earlier.name,
  lines: [earlier.lines[0], Math.max(earlier.lines[1], later.lines[1])],
  blocks: inWrittenOrder([...new Set([...earlier.blocks, ...later.blocks])]),
  children: [...earlier.children, ...later.children],
})

const joinStepsOnOneLine = (steps: readonly WaypointStep[]): WaypointStep[] =>
  steps.reduce<WaypointStep[]>((joined, step) => {
    const earlier = joined.length === 0 ? undefined : joined[joined.length - 1]
    return earlier !== undefined && startLineOf(earlier) === startLineOf(step) ? [...joined.slice(0, -1), joinSteps(earlier, step)] : [...joined, step]
  }, [])

const withOneStepPerLine = (holderLine: number, steps: readonly WaypointStep[]): readonly WaypointStep[] => {
  const kept = joinStepsOnOneLine(liftStepsStartingOn(holderLine, steps))
    .map((step) => ({ ...step, children: withOneStepPerLine(startLineOf(step), step.children) }))
  return kept.length === 1 ? withOneStepPerLine(holderLine, kept[0].children) : kept
}

export const listWaypointSteps = (declarationBlock: CodeBlock, changedBlocks: readonly CodeBlock[]): readonly WaypointStep[] => {
  if (isReadWhole(declarationBlock, [firstLineOf(declarationBlock), lastLineOf(declarationBlock)])) return []
  const stepBlocks = inWrittenOrder([...new Set(changedBlocks.flatMap((block) => stepBlockOf(block, declarationBlock) ?? []))])
  const candidates: StepCandidate[] = stepBlocks.map((block) => ({ block, name: nameOfBlock(block), isStep: true }))
  const insideBlocks = listDescendants(declarationBlock)
  const folding: StepFolding<StepCandidate> = {
    nodeBlock: declarationBlock,
    insideBlocks,
    candidateById: new Map(candidates.map((candidate) => [candidate.block.id, candidate] as const)),
    rules: rulesOf(declarationBlock, listChangedLines([declarationBlock, ...insideBlocks])),
  }
  const rows = candidates.filter((candidate) => isStepRow(candidate, folding))
  const runs = listRuns(rows, folding).map((run): Run => ({
    statements: run.map(({ block }) => block),
    name: nameOfRun(run),
    holderId: holderOf(run[0].block, folding)?.block.id ?? null,
  }))
  return withOneStepPerLine(firstLineOf(declarationBlock), listStepsHeldBy(null, runs, changedBlocks.filter(isChanged)))
}
