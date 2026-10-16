import type { CodeBlockType, JourneyNode, JourneyRowGroupView } from "@flightplan/configurations"
import { listHeadedChildren } from "./headed-children"

const ROUTE: CodeBlockType = "route"
const ROUTE_HEADINGS: readonly string[] = ["POST", "PUT", "PATCH", "GET", "DELETE", "HEAD", "OPTIONS", "ANY"]
const ROUTE_LABEL = "Route"

export const isRouteNode = (node: JourneyNode): boolean => node.type === ROUTE && node.codeBlocks[0].card?.kind === ROUTE

export const listRouteGroups = (node: JourneyNode): JourneyRowGroupView[] => listHeadedChildren(node, ROUTE_HEADINGS)

export const routeHeadOf = (node: JourneyNode): { readonly name: string, readonly typeLabel: string } => ({
  name: node.codeBlocks[0].card?.groupKey ?? "",
  typeLabel: ROUTE_LABEL,
})
