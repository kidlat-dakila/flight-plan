import type { CodeBlock, CodeBlockType } from "@flightplan/configurations"
import { rootBlockOfNode, SAME_NODES } from "./nodes"
import type { CardContext, CardRules, ParentIdById } from "./types"

const RETURNING_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "method"])

export const isReturnedFunction = (block: CodeBlock, isNode: (other: CodeBlock) => boolean): boolean => {
  const holder = block.parentBlock
  return block.isReturned === true && holder !== null && RETURNING_TYPES.has(holder.type) && isNode(holder)
}

const listReturnedFunctionParents = ({ nodes }: CardContext): ParentIdById => {
  const nodeIds = new Set(nodes.map((node) => node.id))
  return new Map(nodes.flatMap((node) => {
    const block = rootBlockOfNode(node)
    const holder = block.parentBlock
    return block.isReturned === true && holder !== null && RETURNING_TYPES.has(holder.type) && nodeIds.has(holder.id) ? [[node.id, holder.id] as const] : []
  }))
}

export const returnedFunctionCard: CardRules = {
  ...SAME_NODES,
  kind: "returned-function",
  isNodeBlock: isReturnedFunction,
  listParents: listReturnedFunctionParents,
}
