import type { CodeBlock, CodeBlockType } from "@flightplan/configurations"
import { isBodyBlock, isNodeBlock } from "./node-blocks"

export interface StepCandidate {
  readonly block: CodeBlock
  readonly name: string
  readonly isStep: boolean
}

export interface StepRules {
  readonly holdsSteps: (block: CodeBlock) => boolean
  readonly holdsBody: (block: CodeBlock) => boolean
  readonly leadsOut: (block: CodeBlock) => boolean
  readonly isFollowing: (earlier: CodeBlock, later: CodeBlock) => boolean
}

export interface StepFolding<Candidate extends StepCandidate> {
  readonly nodeBlock: CodeBlock
  readonly insideBlocks: readonly CodeBlock[]
  readonly candidateById: ReadonlyMap<string, Candidate>
  readonly rules: StepRules
}

const VALUE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["variable", "property"])
const INVOKED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method"])
const CONTROL_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["condition", "switch", "switch-case", "loop", "try-catch"])
const THROW_HOLDER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["condition", "switch", "switch-case", "loop"])
const CALL_OUT_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>([
  "external-value",
  "data",
  "data-fetch",
  "cache",
  "auth",
  "request",
  "navigation",
  "publish",
  "storage",
  "telemetry",
  "transaction",
  "validation",
  "config",
  "feature-flag",
])
const PARAMETER: CodeBlockType = "variable"
const THROW: CodeBlockType = "throw"
const RUN_NAME_SEPARATOR = ", "
const RUN_NAME_COUNT = 2

export const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const isNamed = (block: CodeBlock): boolean => block.name !== undefined

export const isControlBlock = (block: CodeBlock): boolean => CONTROL_TYPES.has(block.type)

export const isNamedFunction = (block: CodeBlock): boolean => INVOKED_TYPES.has(block.type) && isNamed(block)

const isFoldingBlock = (block: CodeBlock): boolean => VALUE_TYPES.has(block.type) || (INVOKED_TYPES.has(block.type) && !isNamed(block) && !isBodyBlock(block))

export const statementOf = (block: CodeBlock, nodeBlock: CodeBlock): CodeBlock => {
  const around = block.parentBlock
  return around === null || around.id === nodeBlock.id || !isFoldingBlock(around) ? block : statementOf(around, nodeBlock)
}

export const holderOf = <Candidate extends StepCandidate>(block: CodeBlock, folding: StepFolding<Candidate>): Candidate | null => {
  const around = block.parentBlock
  if (around === null || around.id === folding.nodeBlock.id) return null
  return folding.candidateById.get(around.id) ?? holderOf(around, folding)
}

export const isWithin = (block: CodeBlock, holder: CodeBlock): boolean =>
  block.parentBlock !== null && (block.parentBlock.id === holder.id || isWithin(block.parentBlock, holder))

const listBlocksOf = <Candidate extends StepCandidate>(statement: CodeBlock, folding: StepFolding<Candidate>): CodeBlock[] => [
  statement,
  ...folding.insideBlocks.filter((block) => isWithin(block, statement)),
]

const callsOut = (block: CodeBlock, rules: StepRules): boolean => CALL_OUT_TYPES.has(block.type) || isNodeBlock(block) || rules.leadsOut(block)

const isFoldedStatement = <Candidate extends StepCandidate>({ block }: Candidate, folding: StepFolding<Candidate>): boolean =>
  isFoldingBlock(block) && !listBlocksOf(block, folding).some((held) => callsOut(held, folding.rules))

const isParameter = ({ type, name, lineOfCodeRangeReference: [range, ...otherRanges] }: CodeBlock): boolean =>
  type === PARAMETER && name !== undefined && otherRanges.length === 0 && range.start.line === range.end.line && range.end.column - range.start.column === name.length

const isThrowOf = (block: CodeBlock, holder: CodeBlock): boolean => block.type === THROW && THROW_HOLDER_TYPES.has(holder.type)

export const isStepRow = <Candidate extends StepCandidate>(candidate: Candidate, folding: StepFolding<Candidate>): boolean => {
  const holder = holderOf(candidate.block, folding)
  if (holder === null) return !isParameter(candidate.block)
  if (!holder.isStep || !isStepRow(holder, folding)) return false
  if (folding.rules.holdsBody(holder.block)) return !isParameter(candidate.block)
  if (!folding.rules.holdsSteps(holder.block)) return false
  return !isThrowOf(candidate.block, holder.block) && !isFoldedStatement(candidate, folding) && listBlocksOf(candidate.block, folding).some(isChanged)
}

const isBodyStatement = <Candidate extends StepCandidate>(candidate: Candidate, folding: StepFolding<Candidate>): boolean => {
  const holder = holderOf(candidate.block, folding)
  return candidate.isStep && isFoldedStatement(candidate, folding) && (holder === null || folding.rules.holdsBody(holder.block))
}

const isFollowingRun = <Candidate extends StepCandidate>(run: readonly Candidate[], row: Candidate, folding: StepFolding<Candidate>): boolean => {
  if (run.length === 0) return false
  const earlier = run[run.length - 1]
  return isBodyStatement(earlier, folding)
    && isBodyStatement(row, folding)
    && holderOf(earlier.block, folding)?.block.id === holderOf(row.block, folding)?.block.id
    && folding.rules.isFollowing(earlier.block, row.block)
}

export const listRuns = <Candidate extends StepCandidate>(rows: readonly Candidate[], folding: StepFolding<Candidate>): Candidate[][] =>
  rows.reduce<Candidate[][]>((runs, row) => {
    const earlier = runs.slice(0, -1)
    const last = runs.slice(-1).flat()
    return isFollowingRun(last, row, folding) ? [...earlier, [...last, row]] : [...runs, [row]]
  }, [])

export const nameOfRun = (run: readonly StepCandidate[]): string => {
  const named = run.slice(0, RUN_NAME_COUNT).map(({ name }) => name).join(RUN_NAME_SEPARATOR)
  return run.length > RUN_NAME_COUNT ? `${named} +${String(run.length - RUN_NAME_COUNT)}` : named
}
