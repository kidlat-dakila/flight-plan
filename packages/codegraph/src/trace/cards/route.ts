import type { CardPart, CodeBlockType, TraceNode, TraceRowGroupView } from "@flightplan/configurations"
import { listHeadedChildren } from "./headed-children"

const ROUTE: CodeBlockType = "route"
const METHOD_HEADINGS: readonly string[] = ["POST", "PUT", "PATCH", "GET", "DELETE", "HEAD", "OPTIONS"]
const ANY_HEADING = "ANY"
const SEVERAL_METHODS_MARK = " · "
const WORD_SEPARATOR = " "
const SEVERAL_METHODS_RANK = METHOD_HEADINGS.length
const ANY_RANK = METHOD_HEADINGS.length + 1
const ROUTE_LABEL = "Route"
const SERVER_ACTION: CardPart = "server-action"
export const SERVER_ACTION_LABEL = "Server action"

export const isRouteNode = (node: TraceNode): boolean => node.type === ROUTE && node.codeBlocks[0].card?.kind === ROUTE

export const isServerActionNode = (node: TraceNode): boolean => {
  const card = node.codeBlocks[0].card
  return card?.kind === ROUTE && card.part === SERVER_ACTION
}

const rankOfHeading = (heading: string): number => {
  const rank = METHOD_HEADINGS.indexOf(heading.split(WORD_SEPARATOR)[0])
  if (heading.startsWith(ANY_HEADING)) return ANY_RANK
  return heading.includes(SEVERAL_METHODS_MARK) || rank === -1 ? SEVERAL_METHODS_RANK : rank
}

const compareHeadings = (one: string, two: string): number => rankOfHeading(one) - rankOfHeading(two) || one.localeCompare(two, undefined, { numeric: true })

const listHeadingsInOrder = (node: TraceNode): string[] =>
  [...new Set(node.children.flatMap((child) => {
    const heading = child.codeBlocks[0].card?.heading ?? null
    return heading === null ? [] : [heading]
  }))].sort(compareHeadings)

export const listRouteGroups = (node: TraceNode): TraceRowGroupView[] => listHeadedChildren(node, listHeadingsInOrder(node))

export const routeHeadOf = (node: TraceNode): { readonly name: string, readonly typeLabel: string } => ({
  name: node.codeBlocks[0].card?.groupKey ?? "",
  typeLabel: ROUTE_LABEL,
})
