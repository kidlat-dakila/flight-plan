import type { SyntaxNode } from "@/ast-graph/parser"
import { collectFromNode } from "@/ast-graph/walk-tree"
import type { ReadBlock } from "@/code-blocks/reading"
import { comparePositions, rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockType, Position, SourceRange } from "@/code-blocks/types"
import { groupBy } from "@/shared/group-by"
import { walkDepthFirst } from "@/shared/reach"

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

interface CallableReturns {
  readonly candidates: readonly ReadBlock[]
  readonly statements: readonly SyntaxNode[]
}

const NO_RETURNS: CallableReturns = { candidates: [], statements: [] }

interface PlacedReturn {
  readonly holderId: string
  readonly at: Position
  readonly order: number
}

const listCallables = (root: SyntaxNode, functionTypes: ReadonlySet<string>): SyntaxNode[] =>
  collectFromNode(root, (node) => ({ found: functionTypes.has(node.type) ? [node] : [], shouldDescend: true }))

const ownReturnsOf = (callable: SyntaxNode, functionTypes: ReadonlySet<string>): SyntaxNode[] =>
  collectFromNode(callable, (node) => ({
    found: node.type === RETURN_TYPE ? [node] : [],
    shouldDescend: node.id === callable.id || !functionTypes.has(node.type),
  }))

const holdsRange = (outer: SourceRange, inner: SourceRange): boolean =>
  comparePositions(outer.start, inner.start) <= 0 && comparePositions(inner.end, outer.end) <= 0

const holds = (block: ReadBlock, inner: SourceRange): boolean => block.ranges.some((range) => holdsRange(range, inner))

const spanOf = (block: ReadBlock): SourceRange => block.ranges[0]

const startsBefore = (block: ReadBlock, position: Position): boolean => comparePositions(spanOf(block).start, position) < 0

const isNarrower = (one: ReadBlock, two: ReadBlock): boolean => holdsRange(spanOf(two), spanOf(one))

const innermostOf = (blocks: readonly ReadBlock[]): ReadBlock | null =>
  blocks.reduce<ReadBlock | null>((innermost, block) => (innermost === null || isNarrower(block, innermost) ? block : innermost), null)

const createIsUnder = (blocks: readonly ReadBlock[]): ((holder: ReadBlock) => (block: ReadBlock) => boolean) => {
  const canonicalBlocks = [...new Map(blocks.map((block) => [block.id, block] as const)).values()]
  const childrenByParentId = groupBy(canonicalBlocks, (block) => block.parentId)
  const reach = { nextOf: (block: ReadBlock) => childrenByParentId.get(block.id) ?? [], keyOf: (block: ReadBlock) => block.id }
  return (holder) => {
    const idsUnder = new Set([...walkDepthFirst([holder], reach)].map((block) => block.id))
    return (block) => block.id === holder.id || (block.parentId !== null && idsUnder.has(block.parentId))
  }
}

const returnsOfCallable = (callable: SyntaxNode, blocks: readonly ReadBlock[], isUnderOf: (holder: ReadBlock) => (block: ReadBlock) => boolean, functionTypes: ReadonlySet<string>): CallableReturns => {
  const statements = ownReturnsOf(callable, functionTypes)
  if (statements.length === 0) return NO_RETURNS
  const callableRange = rangeOfNode(callable)
  const own = innermostOf(blocks.filter((block) => holds(block, callableRange)))
  if (own === null || !CALLABLE_BLOCK_TYPES.has(own.type)) return NO_RETURNS
  return { candidates: blocks.filter(isUnderOf(own)), statements }
}

const holderOfReturn = (range: SourceRange, candidates: readonly ReadBlock[]): ReadBlock | null =>
  innermostOf(candidates.filter((block) => holds(block, range) && startsBefore(block, range.start)))

const placeReturns = ({ candidates, statements }: CallableReturns): PlacedReturn[] =>
  statements.flatMap((statement) => {
    const range = rangeOfNode(statement)
    const holder = holderOfReturn(range, candidates)
    return holder === null ? [] : [{ holderId: holder.id, at: range.start, order: statement.startIndex }]
  })

const inSourceOrder = (placed: readonly PlacedReturn[]): PlacedReturn[] => [...placed].sort((one, two) => one.order - two.order)

export const withReturns = (blocks: readonly ReadBlock[], root: SyntaxNode, functionTypes: ReadonlySet<string>): ReadBlock[] => {
  const isUnderOf = createIsUnder(blocks)
  const placed = inSourceOrder(listCallables(root, functionTypes).flatMap((callable) => placeReturns(returnsOfCallable(callable, blocks, isUnderOf, functionTypes))))
  const returnsAtByHolderId = groupBy(placed, ({ holderId }) => holderId)
  return blocks.map((block) => {
    const returnsAt = returnsAtByHolderId.get(block.id)?.map(({ at }) => at) ?? []
    return returnsAt.length === 0 ? block : { ...block, returnsAt }
  })
}
