import { endOfChain } from "@/shared/chain-end"
import { firstOfEach } from "@/shared/first-of-each"
import type { BlockCard, CardKind, CardPart, CodeBlock, TraceNode, TraceNodeEdge } from "@flightplan/configurations"
import { rootBlockOfNode } from "./nodes"
import type { CardContext, ParentIdById } from "./types"

const HOLDER: CardPart = "holder"
const EDGE_ID_SEPARATOR = " -> "

export const cardOfKind = (block: CodeBlock, kinds: readonly CardKind[]): BlockCard | null =>
  block.card !== undefined && kinds.includes(block.card.kind) ? block.card : null

export const isHolderOfKind = (block: CodeBlock, kinds: readonly CardKind[]): boolean => cardOfKind(block, kinds)?.part === HOLDER

export const isPartOfKind = (block: CodeBlock, kinds: readonly CardKind[]): boolean => {
  const card = cardOfKind(block, kinds)
  return card !== null && card.part !== HOLDER
}

const listWithin = (block: CodeBlock): CodeBlock[] => block.childrenBlocks.flatMap((child) => [child, ...listWithin(child)])

export const holdsNoPart = (block: CodeBlock, kinds: readonly CardKind[]): boolean =>
  isHolderOfKind(block, kinds) && block.parentBlock === null && !listWithin(block).some((inside) => isPartOfKind(inside, kinds))

export const toEdge = (from: string, to: string): TraceNodeEdge => ({ id: [from, to].join(EDGE_ID_SEPARATOR), from, to })

export const nodeIdByBlockIdOf = (nodes: readonly TraceNode[]): ReadonlyMap<string, string> =>
  new Map(firstOfEach([
    ...nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const),
    ...nodes.flatMap((node) => node.codeBlocks.slice(1).map((block) => [block.id, node.id] as const)),
  ], ([blockId]) => blockId))

const blockAroundPart = (block: CodeBlock): CodeBlock | null => block.cardOwner ?? block.parentBlock

const nodeIdAround = (block: CodeBlock | null, ownId: string, nodeIdByBlockId: ReadonlyMap<string, string>): string | null => {
  const otherNodeIdOf = (step: CodeBlock): string | null => {
    const nodeId = nodeIdByBlockId.get(step.id)
    return nodeId !== undefined && nodeId !== ownId ? nodeId : null
  }
  if (block === null) return null
  return otherNodeIdOf(endOfChain(block, { nextOf: (step) => (otherNodeIdOf(step) === null ? blockAroundPart(step) : null), keyOf: (step) => step.id }))
}

export const listPartParents = (kinds: readonly CardKind[]) => ({ nodes }: CardContext): ParentIdById => {
  const nodeIdByBlockId = nodeIdByBlockIdOf(nodes)
  return new Map(nodes.flatMap((node) => {
    const root = rootBlockOfNode(node)
    const parentId = isPartOfKind(root, kinds) ? nodeIdAround(blockAroundPart(root), node.id, nodeIdByBlockId) : null
    return parentId === null ? [] : [[node.id, parentId] as const]
  }))
}
