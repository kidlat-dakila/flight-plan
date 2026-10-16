import type { JourneyNode, JourneyRowGroupView } from "@flightplan/configurations"
import { listHeadedChildren } from "./headed-children"
import { labelOfHeading } from "./labels"

const ROUTER_HEADINGS: readonly string[] = ["QUERY", "MUTATION", "SUBSCRIPTION"]
export const ROUTER_LABEL = "Router"

export const isRouterNode = (node: JourneyNode): boolean => node.codeBlocks[0].card?.kind === "router" && node.codeBlocks[0].card.part === "holder"

export const listRouterGroups = (node: JourneyNode): JourneyRowGroupView[] =>
  listHeadedChildren(node, ROUTER_HEADINGS).map((group) => ({ ...group, label: group.label === null ? null : labelOfHeading(group.label) }))
