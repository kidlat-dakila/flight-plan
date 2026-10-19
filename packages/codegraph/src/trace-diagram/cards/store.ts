import { calledNamesOf, nameOfBlock } from "@/trace/names"
import type { CardKind, CardPart, CodeBlock, TraceNode, TraceNodeEdge } from "@flightplan/configurations"
import { NOTHING_LEFT_OUT, rootBlockOfNode } from "./nodes"
import { cardOfKind, holdsNoPart, isHolderOfKind, isPartOfKind, listPartParents, toEdge } from "./parts"
import type { CardContext, CardRules } from "./types"

const STORE_KINDS: readonly CardKind[] = ["store", "api"]
const API_KINDS: readonly CardKind[] = ["api"]
const ENDPOINT: CardPart = "endpoint"
const GENERATED_HOOK_PATTERN = /^use(?:Lazy)?(?<endpoint>[A-Z]\w*?)(?:Infinite)?(?:Query|Mutation)$/
const ROW_PARTS: ReadonlySet<CardPart> = new Set<CardPart>(["state", "getter", "action"])

export const isStoreHolder = (block: CodeBlock): boolean => isHolderOfKind(block, STORE_KINDS)

export const isStorePart = (block: CodeBlock): boolean => isPartOfKind(block, STORE_KINDS)

const isHeldPart = (block: CodeBlock): boolean => {
  const part = cardOfKind(block, STORE_KINDS)?.part
  return part !== undefined && part !== "holder" && !ROW_PARTS.has(part)
}

export const isPartBeside = (block: CodeBlock): boolean => isStorePart(block) && block.parentBlock === null && block.cardOwner !== null && block.cardOwner !== undefined

const listWithin = (block: CodeBlock): CodeBlock[] => block.childrenBlocks.flatMap((child) => [child, ...listWithin(child)])

export const holdsStoreParts = (block: CodeBlock, nodeBlock: CodeBlock): boolean => isStoreHolder(nodeBlock) && listWithin(block).some(isStorePart)

export const storePartAround = (block: CodeBlock | null, nodeBlock: CodeBlock): CodeBlock | null => {
  if (block === null || block.id === nodeBlock.id || !isStoreHolder(nodeBlock)) return null
  return isStorePart(block) ? block : storePartAround(block.parentBlock, nodeBlock)
}

const isOwnedElsewhere = (part: CodeBlock, holder: CodeBlock): boolean => {
  const owner = part.cardOwner ?? null
  return owner !== null && !listWithin(holder).some((inside) => inside.id === owner.id) && owner.id !== holder.id
}

const registersPartsElsewhere = (block: CodeBlock): boolean => {
  const parts = listWithin(block).filter(isStorePart)
  return !isStorePart(block) && parts.length > 0 && parts.every((part) => isOwnedElsewhere(part, block))
}

const isNoStoreNode = (block: CodeBlock): boolean => holdsNoPart(block, STORE_KINDS) || registersPartsElsewhere(block)

interface HookStep {
  readonly edge: TraceNodeEdge
  readonly endpointId: string
}

const endpointCalledBy = (name: string): string | null => {
  const endpoint = GENERATED_HOOK_PATTERN.exec(name)?.groups?.endpoint ?? null
  return endpoint === null ? null : `${endpoint.charAt(0).toLowerCase()}${endpoint.slice(1)}`
}

const isEndpointOf = (node: TraceNode, api: CodeBlock): boolean => {
  const root = rootBlockOfNode(node)
  return cardOfKind(root, API_KINDS)?.part === ENDPOINT && ((root.cardOwner ?? null)?.id === api.id || rootOfBlock(root).id === api.id)
}

const rootOfBlock = (block: CodeBlock): CodeBlock => (block.parentBlock === null ? block : rootOfBlock(block.parentBlock))

const listHookSteps = ({ nodes, edges }: CardContext): HookStep[] => {
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const))
  return edges.flatMap((edge) => {
    const api = nodeById.get(edge.to)
    const caller = nodeById.get(edge.from)
    if (api === undefined || caller === undefined || !isHolderOfKind(rootBlockOfNode(api), API_KINDS)) return []
    const endpointNames = new Set(caller.codeBlocks.flatMap(calledNamesOf).flatMap((name) => endpointCalledBy(name) ?? []))
    return nodes
      .filter((node) => isEndpointOf(node, rootBlockOfNode(api)) && endpointNames.has(nameOfBlock(rootBlockOfNode(node))))
      .map((endpoint) => ({ edge, endpointId: endpoint.id }))
  })
}

const listHookEdges = (context: CardContext): TraceNodeEdge[] => listHookSteps(context).map(({ edge, endpointId }) => toEdge(edge.from, endpointId))

const listApiEdgeIdsOfHooks = (context: CardContext): ReadonlySet<string> => {
  const ids = listHookSteps(context).map(({ edge }) => edge.id)
  return ids.length === 0 ? NOTHING_LEFT_OUT : new Set(ids)
}

export const storeCard: CardRules = {
  kind: "store",
  isNodeBlock: isHeldPart,
  isNotNodeBlock: isNoStoreNode,
  listParents: listPartParents(STORE_KINDS),
  listLeftOutNodeIds: () => NOTHING_LEFT_OUT,
  groupNodes: () => [],
  listAddedEdges: listHookEdges,
  listLeftOutEdgeIds: listApiEdgeIdsOfHooks,
}

const isFoldedIntoStore = (block: CodeBlock): boolean => isPartBeside(block) || isNoStoreNode(block)

export const ROWS_ONLY_STORE: Partial<CardRules> = {
  isNodeBlock: () => false,
  isNotNodeBlock: isFoldedIntoStore,
}
