import { calledNamesOf, nameOfBlock } from "@/journey/names"
import { firstOfEach } from "@/shared/first-of-each"
import type { CodeBlock, CodeBlockType, NodeBlockListKind } from "@flightplan/configurations"
import { isBodyBlock, isNodeBlock, isStepBlock, nodeBlockOf } from "./node-blocks"
import { holderOf, isChanged, isControlBlock, isNamedFunction, isStepRow, listRuns, nameOfRun, statementOf, type StepCandidate, type StepFolding, type StepRules } from "./step-folding"

export interface ListedBlock {
  readonly kind: NodeBlockListKind
  readonly block: CodeBlock
  readonly name: string
  readonly statements: readonly CodeBlock[]
}

interface Candidate extends StepCandidate {
  readonly kind: NodeBlockListKind
}

const HOOK_NAME_PATTERN = /^use[A-Z]/
const KEPT_VALUE: CodeBlockType = "external-value"
const TRIGGER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "data-fetch"])
const MARKUP_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-root", "render", "render-condition", "render-loop"])
const STEP: NodeBlockListKind = "step"
const BLOCK_LIST_KIND_BY_TYPE: ReadonlyMap<CodeBlockType, NodeBlockListKind> = new Map<CodeBlockType, NodeBlockListKind>([
  ["root-argument-value", "argument"],
  ["state", "state"],
  ["derived", "state"],
  ["effect", "effect"],
  ["component-effect", "effect"],
  ["effect-callback", "effect"],
])

const hookNameOf = (block: CodeBlock): string | null => calledNamesOf(block).find((name) => HOOK_NAME_PATTERN.test(name)) ?? null

const stateAround = (block: CodeBlock, nodeBlock: CodeBlock): CodeBlock | null => {
  const around = block.parentBlock
  if (around === null || around.id === nodeBlock.id) return null
  return BLOCK_LIST_KIND_BY_TYPE.get(around.type) === "state" && !around.isRoot ? around : stateAround(around, nodeBlock)
}

const isStep = (block: CodeBlock): boolean =>
  !TRIGGER_TYPES.has(block.type) && !MARKUP_TYPES.has(block.type) && !isBodyBlock(block) && (isNodeBlock(block) || isStepBlock(block) || isChanged(block))

const toCandidateOf = (kind: NodeBlockListKind, block: CodeBlock, name: string): Candidate => ({ kind, block, name, isStep: kind === STEP })

const toStepCandidate = (block: CodeBlock, nodeBlock: CodeBlock): Candidate => {
  const statement = statementOf(block, nodeBlock)
  return toCandidateOf(STEP, statement, nameOfBlock(statement))
}

const toCandidate = (block: CodeBlock, nodeBlock: CodeBlock): Candidate[] => {
  const kind = BLOCK_LIST_KIND_BY_TYPE.get(block.type)
  const state = kind === "effect" ? stateAround(block, nodeBlock) : null
  if (state !== null) return [toCandidateOf("state", state, nameOfBlock(state))]
  if (kind !== undefined) return [toCandidateOf(kind, block, nameOfBlock(block))]
  const hookName = block.type === KEPT_VALUE ? hookNameOf(block) : null
  if (hookName !== null) return [toCandidateOf("hook", block, hookName)]
  return isStep(block) ? [toStepCandidate(block, nodeBlock)] : []
}

const rulesOf = (nodeBlock: CodeBlock): StepRules => ({
  holdsSteps: (block) => isControlBlock(block) || isNamedFunction(block),
  holdsBody: () => false,
  leadsOut: (block) => block.nextBlocks.some((next) => nodeBlockOf(next)?.id !== nodeBlock.id),
  isFollowing: () => true,
})

const isRow = (candidate: Candidate, folding: StepFolding<Candidate>): boolean =>
  candidate.isStep ? isStepRow(candidate, folding) : isChanged(candidate.block) || holderOf(candidate.block, folding) === null

const toListedBlock = (run: readonly Candidate[]): ListedBlock => ({
  kind: run[0].kind,
  block: run[0].block,
  name: nameOfRun(run),
  statements: run.map(({ block }) => block),
})

export const listListedBlocks = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): ListedBlock[] => {
  const candidates = firstOfEach(insideBlocks.flatMap((block) => toCandidate(block, nodeBlock)), ({ block }) => block.id)
  const folding: StepFolding<Candidate> = { nodeBlock, insideBlocks, candidateById: new Map(candidates.map((candidate) => [candidate.block.id, candidate] as const)), rules: rulesOf(nodeBlock) }
  const rows = candidates.filter((candidate) => isRow(candidate, folding))
  const runs = listRuns(rows.filter((row) => row.isStep), folding)
  const runByFirstId = new Map(runs.map((run) => [run[0].block.id, run] as const))
  const followingIds = new Set(runs.flatMap(([, ...following]) => following.map(({ block }) => block.id)))
  return rows.filter(({ block }) => !followingIds.has(block.id)).map((row) => toListedBlock(runByFirstId.get(row.block.id) ?? [row]))
}
