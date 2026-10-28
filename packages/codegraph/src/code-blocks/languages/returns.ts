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

interface OwnedReturn {
  readonly statement: SyntaxNode
  readonly callable: SyntaxNode
}

const listCallables = (root: SyntaxNode, functionTypes: ReadonlySet<string>): SyntaxNode[] =>
  collectFromNode(root, (node) => ({ found: functionTypes.has(node.type) ? [node] : [], shouldDescend: true }))

const ownReturnsOf = (callable: SyntaxNode, functionTypes: ReadonlySet<string>): OwnedReturn[] =>
  collectFromNode(callable, (node) => ({
    found: node.type === RETURN_TYPE ? [{ statement: node, callable }] : [],
    shouldDescend: node.id === callable.id || !functionTypes.has(node.type),
  }))

const inSourceOrder = (owned: readonly OwnedReturn[]): OwnedReturn[] => [...owned].sort((one, two) => one.statement.startIndex - two.statement.startIndex)

const listOwnedReturns = (root: SyntaxNode, functionTypes: ReadonlySet<string>): OwnedReturn[] =>
  inSourceOrder(listCallables(root, functionTypes).flatMap((callable) => ownReturnsOf(callable, functionTypes)))

const holdsRange = (outer: SourceRange, inner: SourceRange): boolean =>
  comparePositions(outer.start, inner.start) <= 0 && comparePositions(inner.end, outer.end) <= 0

const holds = (block: ReadBlock, inner: SourceRange): boolean => block.ranges.some((range) => holdsRange(range, inner))

const spanOf = (block: ReadBlock): SourceRange => block.ranges[0]

const startsBefore = (block: ReadBlock, position: Position): boolean => comparePositions(spanOf(block).start, position) < 0

const isNarrower = (one: ReadBlock, two: ReadBlock): boolean => holdsRange(spanOf(two), spanOf(one))

const innermostOf = (blocks: readonly ReadBlock[]): ReadBlock | null =>
  blocks.reduce<ReadBlock | null>((innermost, block) => (innermost === null || isNarrower(block, innermost) ? block : innermost), null)

const parentOf = (block: ReadBlock, blockById: ReadonlyMap<string, ReadBlock>): ReadBlock | undefined =>
  block.parentId === null ? undefined : blockById.get(block.parentId)

function* selfAndOuterBlocksOf(block: ReadBlock, blockById: ReadonlyMap<string, ReadBlock>): Generator<ReadBlock> {
  for (let current: ReadBlock | undefined = block; current !== undefined; current = parentOf(current, blockById)) yield current
}

const isUnder = (block: ReadBlock, holderId: string, blockById: ReadonlyMap<string, ReadBlock>): boolean =>
  [...selfAndOuterBlocksOf(block, blockById)].some((outer) => outer.id === holderId)

const holderOfReturn = ({ statement, callable }: OwnedReturn, blocks: readonly ReadBlock[], blockById: ReadonlyMap<string, ReadBlock>): ReadBlock | null => {
  const own = innermostOf(blocks.filter((block) => holds(block, rangeOfNode(callable))))
  if (own === null || !CALLABLE_BLOCK_TYPES.has(own.type)) return null
  const range = rangeOfNode(statement)
  return innermostOf(blocks.filter((block) => holds(block, range) && startsBefore(block, range.start) && isUnder(block, own.id, blockById)))
}

export const withReturns = (blocks: readonly ReadBlock[], root: SyntaxNode, functionTypes: ReadonlySet<string>): ReadBlock[] => {
  const blockById = new Map(blocks.map((block) => [block.id, block] as const))
  const placed = listOwnedReturns(root, functionTypes).flatMap((owned) => {
    const holder = holderOfReturn(owned, blocks, blockById)
    return holder === null ? [] : [{ holderId: holder.id, at: rangeOfNode(owned.statement).start }]
  })
  return blocks.map((block) => {
    const returnsAt = placed.filter(({ holderId }) => holderId === block.id).map(({ at }) => at)
    return returnsAt.length === 0 ? block : { ...block, returnsAt }
  })
}
