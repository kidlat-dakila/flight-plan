import { BLOCK_TYPE_LABELS } from "@/trace/names"
import { toTraceNode } from "@/trace-diagram"
import { isMemoBlock } from "@/trace-diagram/hook-calls"
import type { ListedBlock } from "@/trace-diagram/listed-blocks"
import type { CodeBlock, CodeBlockType, TraceNode, TraceRowGroupView } from "@flightplan/configurations"
import { CONTROLLER_LABEL, isControllerNode, listClassGroups } from "./class"
import { listRowsInOrder } from "./function"
import { isRouteNode, isServerActionNode, listRouteGroups, routeHeadOf, SERVER_ACTION_LABEL } from "./route"
import { isResolverNode, isRouterNode, listRouterGroups, RESOLVER_LABEL, ROUTER_LABEL } from "./router"
import { API_LABEL, isApiNode, isStoreNode, listStoreGroups } from "./store"

const CLASS: CodeBlockType = "class"
const MEMO_LABEL = "Memo"

export interface NodeHead {
  readonly name: string
  readonly typeLabel: string
}

export const listsNoRows = (node: TraceNode): boolean => isRouteNode(node) || isRouterNode(node)

export const headOfNode = (node: TraceNode, head: NodeHead): NodeHead => {
  if (isRouteNode(node)) return routeHeadOf(node)
  if (isApiNode(node)) return { ...head, typeLabel: API_LABEL }
  if (isServerActionNode(node)) return { ...head, typeLabel: SERVER_ACTION_LABEL }
  if (isControllerNode(node)) return { ...head, typeLabel: CONTROLLER_LABEL }
  if (isResolverNode(node)) return { ...head, typeLabel: RESOLVER_LABEL }
  if (isMemoBlock(node.codeBlocks[0])) return { ...head, typeLabel: MEMO_LABEL }
  return isRouterNode(node) ? { ...head, typeLabel: ROUTER_LABEL } : head
}

export const typeLabelOfBlock = (block: CodeBlock): string =>
  headOfNode(toTraceNode(block, []), { name: "", typeLabel: BLOCK_TYPE_LABELS[block.type] }).typeLabel

export const listRowGroups = (node: TraceNode, rows: readonly ListedBlock[]): TraceRowGroupView[] => {
  if (isRouteNode(node)) return listRouteGroups(node)
  if (isRouterNode(node)) return listRouterGroups(node)
  if (isStoreNode(node)) return listStoreGroups(node, rows)
  if (node.type === CLASS) return listClassGroups(node, rows, node.triggerLabels)
  return listRowsInOrder(rows, node.triggerLabels)
}

export { BLOCK_LIST_KINDS, BLOCK_LIST_LABELS, labelOfRow } from "./labels"
