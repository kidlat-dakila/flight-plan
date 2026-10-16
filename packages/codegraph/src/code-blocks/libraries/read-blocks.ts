import type { ReadBlock } from "@/code-blocks/reading"
import { containsRange, isSameRange } from "@/code-blocks/source-range"
import type { CodeBlockType, SourceRange } from "@/code-blocks/types"

const CALLABLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component", "method"])

const isHolding = (block: ReadBlock, range: SourceRange): boolean => block.ranges.some((held) => containsRange(held, range))

const isAt = (block: ReadBlock, range: SourceRange): boolean => block.argument === undefined && isSameRange(block.ranges[0], range)

export const outermostAt = (blocks: readonly ReadBlock[], range: SourceRange): ReadBlock | null => blocks.find((block) => isAt(block, range)) ?? null

export const innermostAt = (blocks: readonly ReadBlock[], range: SourceRange): ReadBlock | null => {
  const atRange = blocks.filter((block) => isAt(block, range))
  return atRange.length === 0 ? null : atRange[atRange.length - 1]
}

export const innermostAround = (blocks: readonly ReadBlock[], range: SourceRange, isWanted: (block: ReadBlock) => boolean): ReadBlock | null =>
  blocks
    .filter((block) => isWanted(block) && isHolding(block, range))
    .reduce<ReadBlock | null>((innermost, block) => (innermost === null || isHolding(innermost, block.ranges[0]) ? block : innermost), null)

export const innermostCallableAround = (blocks: readonly ReadBlock[], range: SourceRange): ReadBlock | null =>
  innermostAround(blocks, range, (block) => CALLABLE_TYPES.has(block.type) && block.argument === undefined)

export const childrenOf = (blocks: readonly ReadBlock[], parent: ReadBlock): ReadBlock[] =>
  blocks.filter((block) => block.parentId === parent.id && block.argument === undefined && block.isParameter !== true)

export const descendantsOf = (blocks: readonly ReadBlock[], parent: ReadBlock): ReadBlock[] =>
  childrenOf(blocks, parent).flatMap((child) => [child, ...descendantsOf(blocks, child)])

export const parentOf = (blocks: readonly ReadBlock[], block: ReadBlock): ReadBlock | null =>
  block.parentId === null ? null : (blocks.find((candidate) => candidate.id === block.parentId) ?? null)

export const rootOf = (blocks: readonly ReadBlock[], block: ReadBlock): ReadBlock => {
  const parent = parentOf(blocks, block)
  return parent === null ? block : rootOf(blocks, parent)
}

const WRITTEN_FUNCTION: CodeBlockType = "function"

export const writtenFunctionAt = (blocks: readonly ReadBlock[], range: SourceRange): ReadBlock | null => {
  const written = innermostAt(blocks, range)
  return written?.type === WRITTEN_FUNCTION ? written : null
}

export const blockOfCall = (blocks: readonly ReadBlock[], range: SourceRange): ReadBlock | null =>
  innermostAt(blocks, range) ?? innermostAround(blocks, range, (block) => block.argument === undefined && block.isParameter !== true)
