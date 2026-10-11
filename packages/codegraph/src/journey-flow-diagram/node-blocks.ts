import type { CodeBlock, CodeBlockType } from "@flightplan/configurations"

export interface NodeStep {
  readonly from: CodeBlock
  readonly fromBlock: CodeBlock
  readonly to: CodeBlock
  readonly toBlock: CodeBlock
}

type NextBlocksOf = (block: CodeBlock) => readonly CodeBlock[]

const PART_OF_RENDER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>([
  "variable",
  "property",
  "root-argument-value",
  "external-value",
  "state",
  "derived",
  "component",
  "render-root",
  "render",
  "render-condition",
  "render-loop",
  "deleted",
  "type-declaration",
  "import",
  "file",
])
const TRIGGERED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>([
  "render-event",
  "code-event",
  "effect-callback",
  "route",
  "resolver",
  "middleware",
  "effect",
  "component-effect",
])
const INVOKED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method", "hook"])
const VALUE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["variable", "property", "root-argument-value", "external-value", "state", "derived"])
const RENDERED_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["component", "hook"])
const BODY_HOLDER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "effect-callback"])
const EFFECT_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["effect", "component-effect"])
const FUNCTION: CodeBlockType = "function"
const CALLBACK: CodeBlockType = "effect-callback"
const STATEMENT: CodeBlockType = "root-statement"
const KEPT_STATE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["state", "derived"])
const IN_PLACE = "in-place"

const isStateCall = (block: CodeBlock): boolean => EFFECT_TYPES.has(block.type) && block.parentBlock !== null && KEPT_STATE_TYPES.has(block.parentBlock.type)

const isInPlaceCallback = (block: CodeBlock): boolean =>
  block.type === CALLBACK && (block.catalogue?.runs === IN_PLACE || (block.parentBlock !== null && isStateCall(block.parentBlock)))

export const isBodyBlock = (block: CodeBlock): boolean =>
  block.type === FUNCTION && block.parentBlock !== null && BODY_HOLDER_TYPES.has(block.parentBlock.type)

const isPartOfRender = (block: CodeBlock): boolean =>
  PART_OF_RENDER_TYPES.has(block.type) || isStateCall(block) || isInPlaceCallback(block) || isBodyBlock(block)

const isTriggered = (block: CodeBlock): boolean => TRIGGERED_TYPES.has(block.type) && !isPartOfRender(block)

const isInvoked = (block: CodeBlock): boolean => INVOKED_TYPES.has(block.type) && !isPartOfRender(block)

const isExecutedAfterRender = (block: CodeBlock): boolean => {
  const around = block.parentBlock
  if (around === null || RENDERED_TYPES.has(around.type)) return false
  return around.parentBlock === null || isTriggered(around) || isInvoked(around) || isExecutedAfterRender(around)
}

export const isNodeBlock = (block: CodeBlock): boolean => (block.parentBlock === null ? block.type !== STATEMENT : isTriggered(block))

export const isStepBlock = (block: CodeBlock): boolean =>
  block.parentBlock !== null && !isPartOfRender(block) && !isTriggered(block) && (isInvoked(block) || isExecutedAfterRender(block))

const holderBlockOf = (block: CodeBlock): CodeBlock => (block.parentBlock === null || isNodeBlock(block) ? block : holderBlockOf(block.parentBlock))

export const nodeBlockOf = (block: CodeBlock): CodeBlock | null => {
  const holder = holderBlockOf(block)
  return isNodeBlock(holder) ? holder : null
}

export const nodeBlockAround = (block: CodeBlock): CodeBlock | null => (block.parentBlock === null ? null : nodeBlockOf(block.parentBlock))

const isInStep = (block: CodeBlock): boolean => !isNodeBlock(block) && (isStepBlock(block) || (block.parentBlock !== null && isInStep(block.parentBlock)))

const isAround = (outer: CodeBlock, inner: CodeBlock): boolean =>
  inner.parentBlock !== null && (inner.parentBlock.id === outer.id || isAround(outer, inner.parentBlock))

const stepsInto = (from: CodeBlock, fromBlock: CodeBlock, toBlock: CodeBlock, nextBlocksOf: NextBlocksOf, carriedIds: ReadonlySet<string>): NodeStep[] => {
  const to = nodeBlockOf(toBlock)
  if (to === null) return []
  const isInFrom = to.id === from.id
  const isCarried = toBlock.id !== to.id && (isInFrom ? isInStep(fromBlock) && VALUE_TYPES.has(toBlock.type) : isAround(to, from))
  if (isCarried) {
    if (carriedIds.has(toBlock.id)) return []
    return nextBlocksOf(toBlock).flatMap((next) => stepsInto(from, fromBlock, next, nextBlocksOf, new Set([...carriedIds, toBlock.id])))
  }
  return isInFrom || isAround(from, to) ? [] : [{ from, fromBlock, to, toBlock }]
}

export const listNodeSteps = (blocks: readonly CodeBlock[], nextBlocksOf: NextBlocksOf): NodeStep[] =>
  blocks.flatMap((block) => {
    const from = nodeBlockOf(block)
    return from === null ? [] : nextBlocksOf(block).flatMap((next) => stepsInto(from, block, next, nextBlocksOf, new Set()))
  })
