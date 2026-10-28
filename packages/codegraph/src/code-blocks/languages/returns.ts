import type { SyntaxNode } from "@/ast-graph/parser"
import { collectFromNode } from "@/ast-graph/walk-tree"
import type { ReadBlock } from "@/code-blocks/reading"
import { comparePositions, rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockType, Position, SourceRange } from "@/code-blocks/types"

const RETURN_TYPE = "return_statement"
const CALLABLE_BLOCK_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>([
  "function",
  "method",
  "hook",
  "component",
  "effect-callback",
  "code-event",
  "render-event",
])

const listReturns = (root: SyntaxNode): SyntaxNode[] =>
  collectFromNode(root, (node) => ({ found: node.type === RETURN_TYPE ? [node] : [], shouldDescend: true }))

const functionAround = (node: SyntaxNode, functionTypes: ReadonlySet<string>): SyntaxNode | null => {
  const { parent } = node
  if (parent === null) return null
  return functionTypes.has(parent.type) ? parent : functionAround(parent, functionTypes)
}

const holdsRange = (outer: SourceRange, inner: SourceRange): boolean =>
  comparePositions(outer.start, inner.start) <= 0 && comparePositions(inner.end, outer.end) <= 0

const holds = (block: ReadBlock, inner: SourceRange): boolean => block.ranges.some((range) => holdsRange(range, inner))

const spanOf = (block: ReadBlock): SourceRange => block.ranges[0]

const startsBefore = (block: ReadBlock, position: Position): boolean => comparePositions(spanOf(block).start, position) < 0

const isNarrower = (one: ReadBlock, two: ReadBlock): boolean => holdsRange(spanOf(two), spanOf(one))

const innermostOf = (blocks: readonly ReadBlock[]): ReadBlock | null =>
  blocks.reduce<ReadBlock | null>((innermost, block) => (innermost === null || isNarrower(block, innermost) ? block : innermost), null)

const isUnder = (block: ReadBlock, holderId: string, blockById: ReadonlyMap<string, ReadBlock>): boolean => {
  if (block.id === holderId) return true
  const parent = block.parentId === null ? undefined : blockById.get(block.parentId)
  return parent !== undefined && isUnder(parent, holderId, blockById)
}

const holderOfReturn = (statement: SyntaxNode, blocks: readonly ReadBlock[], functionTypes: ReadonlySet<string>, blockById: ReadonlyMap<string, ReadBlock>): ReadBlock | null => {
  const callable = functionAround(statement, functionTypes)
  if (callable === null) return null
  const own = innermostOf(blocks.filter((block) => holds(block, rangeOfNode(callable))))
  if (own === null || !CALLABLE_BLOCK_TYPES.has(own.type)) return null
  const range = rangeOfNode(statement)
  return innermostOf(blocks.filter((block) => holds(block, range) && startsBefore(block, range.start) && isUnder(block, own.id, blockById)))
}

export const withReturns = (blocks: readonly ReadBlock[], root: SyntaxNode, functionTypes: ReadonlySet<string>): ReadBlock[] => {
  const blockById = new Map(blocks.map((block) => [block.id, block] as const))
  const placed = listReturns(root).flatMap((statement) => {
    const holder = holderOfReturn(statement, blocks, functionTypes, blockById)
    return holder === null ? [] : [{ holderId: holder.id, at: rangeOfNode(statement).start }]
  })
  return blocks.map((block) => {
    const returnsAt = placed.filter(({ holderId }) => holderId === block.id).map(({ at }) => at)
    return returnsAt.length === 0 ? block : { ...block, returnsAt }
  })
}
