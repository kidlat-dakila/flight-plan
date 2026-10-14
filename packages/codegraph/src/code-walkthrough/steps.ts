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

const toStep = (run: Run, runs: readonly Run[], changedBlocks: readonly CodeBlock[]): WaypointStep => {
  const { statements, name } = run
  const folded = changedBlocks.filter((block) => statements.some((statement) => isWithin(block, statement)))
  return {
    name,
    lines: [Math.min(...statements.map(firstLineOf)), Math.max(...statements.map(lastLineOf))],
    blocks: inWrittenOrder([...new Set([...statements, ...folded])]),
    children: listStepsHeldBy(statements[0].id, runs, changedBlocks),
  }
}

const withoutLoneStep = (steps: readonly WaypointStep[]): readonly WaypointStep[] => (steps.length === 1 ? withoutLoneStep(steps[0].children) : steps)

const listStepsHeldBy = (holderId: string | null, runs: readonly Run[], changedBlocks: readonly CodeBlock[]): readonly WaypointStep[] =>
  withoutLoneStep(runs.filter((run) => run.holderId === holderId).map((run) => toStep(run, runs, changedBlocks)))

export const listWaypointSteps = (declarationBlock: CodeBlock, changedBlocks: readonly CodeBlock[]): readonly WaypointStep[] => {
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
  return listStepsHeldBy(null, runs, changedBlocks.filter(isChanged))
}
