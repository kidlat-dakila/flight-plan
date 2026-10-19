import { firstOfEach } from "@/shared/first-of-each"
import type { CardKind, CardPart, CodeBlock, CodeBlockType, TraceNode, TraceNodeEdge } from "@flightplan/configurations"
import { isNoNodeBlock, NOTHING_LEFT_OUT, rootBlockOfNode } from "./nodes"
import { cardOfKind, holdsNoPart, listPartParents, toEdge } from "./parts"
import type { CardContext, CardRules } from "./types"

const ROUTER_KINDS: readonly CardKind[] = ["router"]
const PROCEDURE: CardPart = "procedure"
const MIDDLEWARE: CardPart = "middleware"
const WRITTEN_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["effect-callback", "function"])

interface BuiltOn {
  readonly baseId: string
  readonly procedureId: string
}

const isProcedure = (block: CodeBlock): boolean => cardOfKind(block, ROUTER_KINDS)?.part === PROCEDURE

const isBase = (block: CodeBlock): boolean => cardOfKind(block, ROUTER_KINDS)?.part === MIDDLEWARE

const listChainBlocks = (block: CodeBlock): CodeBlock[] =>
  [block, ...block.childrenBlocks.filter((child) => !WRITTEN_TYPES.has(child.type)).flatMap(listChainBlocks)]

const basesOf = (procedure: CodeBlock): CodeBlock[] =>
  firstOfEach(
    listChainBlocks(procedure).flatMap((block) =>
      block.outerSymbols.flatMap((symbol) => (symbol.type === "internal-code-block" || symbol.type === "external-block") && isBase(symbol.codeBlockReference) ? [symbol.codeBlockReference] : [])),
    (block) => block.id,
  )

const listBuiltOn = ({ nodes }: CardContext): BuiltOn[] => {
  const nodeIdByRootId = new Map(nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const))
  return nodes.filter((node) => isProcedure(rootBlockOfNode(node))).flatMap((node) =>
    basesOf(rootBlockOfNode(node)).flatMap((base) => {
      const baseId = nodeIdByRootId.get(base.id)
      return baseId === undefined ? [] : [{ baseId, procedureId: node.id }]
    }))
}

const listBaseEdges = (context: CardContext): TraceNodeEdge[] => listBuiltOn(context).map(({ baseId, procedureId }) => toEdge(baseId, procedureId))

const listProcedureToBaseIds = (context: CardContext): ReadonlySet<string> => {
  const ids = listBuiltOn(context).map(({ baseId, procedureId }) => toEdge(procedureId, baseId).id)
  return ids.length === 0 ? NOTHING_LEFT_OUT : new Set(ids)
}

export const isRouterNode = (node: TraceNode): boolean => cardOfKind(rootBlockOfNode(node), ROUTER_KINDS)?.part === "holder"

export const routerCard: CardRules = {
  kind: "router",
  isNodeBlock: isNoNodeBlock,
  isNotNodeBlock: (block) => holdsNoPart(block, ROUTER_KINDS),
  listParents: listPartParents(ROUTER_KINDS),
  listLeftOutNodeIds: () => NOTHING_LEFT_OUT,
  groupNodes: () => [],
  listAddedEdges: listBaseEdges,
  listLeftOutEdgeIds: listProcedureToBaseIds,
}
