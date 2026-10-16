import type { ListedBlock } from "@/journey-flow-diagram/listed-blocks"
import type { CodeBlockType, JourneyNode, JourneyRowGroupView } from "@flightplan/configurations"
import { listClassGroups } from "./class"
import { listComponentGroups } from "./component"
import { listRowsInOrder } from "./function"
import { isRouteNode, listRouteGroups, routeHeadOf } from "./route"
import { isRouterNode, listRouterGroups, ROUTER_LABEL } from "./router"
import { API_LABEL, isApiNode, isStoreNode, listStoreGroups } from "./store"

const COMPONENT: CodeBlockType = "component"
const CLASS: CodeBlockType = "class"
const RETURNING_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "method"])

const returnsFunction = (node: JourneyNode): boolean =>
  RETURNING_TYPES.has(node.type) && node.children.some((child) => child.codeBlocks[0].isReturned === true)

export interface NodeHead {
  readonly name: string
  readonly typeLabel: string
}

export const listsNoRows = (node: JourneyNode): boolean => isRouteNode(node) || isRouterNode(node)

export const headOfNode = (node: JourneyNode, head: NodeHead): NodeHead => {
  if (isRouteNode(node)) return routeHeadOf(node)
  if (isApiNode(node)) return { ...head, typeLabel: API_LABEL }
  return isRouterNode(node) ? { ...head, typeLabel: ROUTER_LABEL } : head
}

export const listRowGroups = (node: JourneyNode, rows: readonly ListedBlock[]): JourneyRowGroupView[] => {
  if (isRouteNode(node)) return listRouteGroups(node)
  if (isRouterNode(node)) return listRouterGroups(node)
  if (isStoreNode(node)) return listStoreGroups(node, rows)
  if (node.type === COMPONENT || returnsFunction(node)) return listComponentGroups(rows, node.triggerLabels)
  if (node.type === CLASS) return listClassGroups(node, rows, node.triggerLabels)
  return listRowsInOrder(rows, node.triggerLabels)
}

export { BLOCK_LIST_KINDS, BLOCK_LIST_LABELS, labelOfRow } from "./labels"
