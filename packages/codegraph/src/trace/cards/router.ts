import type { CodeBlockType, JourneyNode, JourneyRowGroupView } from "@flightplan/configurations"
import { METHODS_LABEL } from "./class"
import { listHeadedChildren } from "./headed-children"
import { labelOfHeading } from "./labels"

const ROUTER_HEADINGS: readonly string[] = ["QUERY", "MUTATION", "SUBSCRIPTION", "FIELD"]
const CLASS: CodeBlockType = "class"
export const ROUTER_LABEL = "Router"
export const RESOLVER_LABEL = "Resolver"

export const isRouterNode = (node: JourneyNode): boolean => node.codeBlocks[0].card?.kind === "router" && node.codeBlocks[0].card.part === "holder"

export const isResolverNode = (node: JourneyNode): boolean => isRouterNode(node) && node.type === CLASS

const listUnheadedChildIds = (node: JourneyNode): string[] =>
  node.children.filter((child) => (child.codeBlocks[0].card?.heading ?? null) === null).map((child) => child.id)

export const listRouterGroups = (node: JourneyNode): JourneyRowGroupView[] => [
  ...listHeadedChildren(node, ROUTER_HEADINGS).map((group) => ({ ...group, label: group.label === null ? null : labelOfHeading(group.label) })),
  { label: METHODS_LABEL, rowIds: [], childIds: listUnheadedChildIds(node) },
].filter(({ childIds }) => childIds.length > 0)
