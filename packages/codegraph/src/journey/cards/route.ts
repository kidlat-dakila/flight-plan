import type { CodeBlockType, JourneyNode, JourneyRowGroupView } from "@flightplan/configurations"
import { listHeadedChildren } from "./headed-children"

const ROUTE: CodeBlockType = "route"
const METHOD_HEADINGS: readonly string[] = ["POST", "PUT", "PATCH", "GET", "DELETE", "HEAD", "OPTIONS"]
const ANY_HEADING = "ANY"
const ROUTE_LABEL = "Route"

export const isRouteNode = (node: JourneyNode): boolean => node.type === ROUTE && node.codeBlocks[0].card?.kind === ROUTE

const listSeveralMethodHeadings = (node: JourneyNode): string[] => [
  ...new Set(node.children.flatMap((child) => {
    const heading = child.codeBlocks[0].card?.heading ?? null
    return heading === null || heading === ANY_HEADING || METHOD_HEADINGS.includes(heading) ? [] : [heading]
  })),
]

export const listRouteGroups = (node: JourneyNode): JourneyRowGroupView[] =>
  listHeadedChildren(node, [...METHOD_HEADINGS, ...listSeveralMethodHeadings(node), ANY_HEADING])

export const routeHeadOf = (node: JourneyNode): { readonly name: string, readonly typeLabel: string } => ({
  name: node.codeBlocks[0].card?.groupKey ?? "",
  typeLabel: ROUTE_LABEL,
})
