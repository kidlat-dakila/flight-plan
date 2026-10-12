import { calledNamesOf, nameOfBlock } from "@/journey/names"
import { firstOfEach } from "@/shared/first-of-each"
import type { CodeBlock, CodeBlockType, NodeBlockListKind } from "@flightplan/configurations"
import { isBodyBlock, isNodeBlock, isStepBlock } from "./node-blocks"

export interface ListedBlock {
  readonly kind: NodeBlockListKind
  readonly block: CodeBlock
  readonly name: string
}

const HOOK_NAME_PATTERN = /^use[A-Z]/
const KEPT_VALUE: CodeBlockType = "external-value"
const TRIGGER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "data-fetch"])
const MARKUP_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-root", "render", "render-condition", "render-loop"])
const BLOCK_LIST_KIND_BY_TYPE: ReadonlyMap<CodeBlockType, NodeBlockListKind> = new Map<CodeBlockType, NodeBlockListKind>([
  ["root-argument-value", "argument"],
  ["state", "state"],
  ["derived", "state"],
  ["effect", "effect"],
  ["component-effect", "effect"],
  ["effect-callback", "effect"],
])

const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const hookNameOf = (block: CodeBlock): string | null => calledNamesOf(block).find((name) => HOOK_NAME_PATTERN.test(name)) ?? null

const stateAround = (block: CodeBlock, nodeBlock: CodeBlock): CodeBlock | null => {
  const around = block.parentBlock
  if (around === null || around.id === nodeBlock.id) return null
  return BLOCK_LIST_KIND_BY_TYPE.get(around.type) === "state" && !around.isRoot ? around : stateAround(around, nodeBlock)
}

const isStep = (block: CodeBlock): boolean =>
  !TRIGGER_TYPES.has(block.type) && !MARKUP_TYPES.has(block.type) && !isBodyBlock(block) && (isNodeBlock(block) || isStepBlock(block) || isChanged(block))

const toListedBlock = (block: CodeBlock, nodeBlock: CodeBlock): ListedBlock[] => {
  const kind = BLOCK_LIST_KIND_BY_TYPE.get(block.type)
  const state = kind === "effect" ? stateAround(block, nodeBlock) : null
  if (state !== null) return [{ kind: "state", block: state, name: nameOfBlock(state) }]
  if (kind !== undefined) return [{ kind, block, name: nameOfBlock(block) }]
  const hookName = block.type === KEPT_VALUE ? hookNameOf(block) : null
  if (hookName !== null) return [{ kind: "hook", block, name: hookName }]
  return isStep(block) ? [{ kind: "step", block, name: nameOfBlock(block) }] : []
}

const isInside = (block: CodeBlock, holderIds: ReadonlySet<string>): boolean =>
  block.parentBlock !== null && (holderIds.has(block.parentBlock.id) || isInside(block.parentBlock, holderIds))

export const listListedBlocks = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): ListedBlock[] => {
  const listed = firstOfEach(insideBlocks.flatMap((block) => toListedBlock(block, nodeBlock)), ({ block }) => block.id)
  const listedIds = new Set(listed.map(({ block }) => block.id))
  return listed.filter(({ block }) => isChanged(block) || !isInside(block, listedIds))
}
