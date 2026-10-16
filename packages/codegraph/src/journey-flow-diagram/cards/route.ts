import { compareRanges } from "@/code-blocks/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import type { BlockCard, CardKind, CardPart, CodeBlock, JourneyNode, JourneyNodeEdge } from "@flightplan/configurations"
import { filePathOfNode, NOTHING_LEFT_OUT, rootBlockOfNode } from "./nodes"
import { cardOfKind, listPartParents, nodeIdByBlockIdOf, toEdge } from "./parts"
import type { CardContext, CardRules, NodeGroup, ParentIdById } from "./types"

const ROUTE_KINDS: readonly CardKind[] = ["route"]
const HOLDER: CardPart = "holder"
const HANDLER: CardPart = "handler"
const MIDDLEWARE: CardPart = "middleware"
const ROUTE_TYPE = "route"
const GROUP_ID_MARK = "#route@"
const NAMING_USES: ReadonlySet<string> = new Set(["value", "read"])

const routeCardOf = (block: CodeBlock): BlockCard | null => cardOfKind(block, ROUTE_KINDS)

export const isRegistration = (block: CodeBlock): boolean => routeCardOf(block)?.part === HOLDER

const isSlot = (block: CodeBlock): boolean => {
  const part = routeCardOf(block)?.part
  return (part === HANDLER || part === MIDDLEWARE) && block.parentBlock !== null && isRegistration(block.parentBlock)
}

const isNamingSlot = (block: CodeBlock): boolean => isSlot(block) && block.childrenBlocks.length === 0

const isWrittenSlot = (block: CodeBlock): boolean => isSlot(block) && block.childrenBlocks.length > 0

const isDecoratedHandler = (block: CodeBlock): boolean => routeCardOf(block)?.part === HANDLER && block.parentBlock === null && block.cardOwner === null

const groupKeyOf = (node: JourneyNode): string | null => {
  const root = rootBlockOfNode(node)
  return isRegistration(root) || isDecoratedHandler(root) ? (routeCardOf(root)?.groupKey ?? null) : null
}

export const routeGroupIdOf = (filePath: string, groupKey: string): string => `${filePath}${GROUP_ID_MARK}${groupKey}`

const compareNodes = (one: JourneyNode, two: JourneyNode): number =>
  filePathOfNode(one).localeCompare(filePathOfNode(two)) || compareRanges(rootBlockOfNode(one).lineOfCodeRangeReference[0], rootBlockOfNode(two).lineOfCodeRangeReference[0])

const toGroup = (groupKey: string, keyed: readonly JourneyNode[]): NodeGroup => {
  const members = keyed.filter((node) => isRegistration(rootBlockOfNode(node))).sort(compareNodes)
  const codeBlocks = members.length === 0 ? [rootBlockOfNode(keyed[0])] : firstOfEach(members.flatMap((node) => node.codeBlocks), (block) => block.id)
  return {
    node: {
      id: routeGroupIdOf(filePathOfNode(members[0] ?? keyed[0]), groupKey),
      type: ROUTE_TYPE,
      label: null,
      description: null,
      codeBlocks,
      diffCodeBlocks: members.flatMap((node) => node.diffCodeBlocks),
      children: [],
      triggerLabels: [],
      blockLabels: [],
    },
    memberIds: members.map((node) => node.id),
    placedAtId: keyed[0].id,
  }
}

const groupRouteNodes = (nodes: readonly JourneyNode[]): NodeGroup[] => {
  const keyed = nodes.flatMap((node) => {
    const groupKey = groupKeyOf(node)
    return groupKey === null ? [] : [{ groupKey, node }]
  })
  return [...groupBy(keyed, ({ groupKey }) => groupKey)].map(([groupKey, entries]) => toGroup(groupKey, entries.map(({ node }) => node)))
}

const isRouteGroup = (node: JourneyNode): boolean => node.type === ROUTE_TYPE && routeCardOf(rootBlockOfNode(node)) !== null

const listDecoratedParents = ({ nodes }: CardContext): ParentIdById => {
  const groupIdByKey = new Map(nodes.filter(isRouteGroup).map((node) => [routeCardOf(rootBlockOfNode(node))?.groupKey ?? "", node.id] as const))
  return new Map(nodes.flatMap((node) => {
    const root = rootBlockOfNode(node)
    const groupId = isRouteGroup(node) || !isDecoratedHandler(root) ? undefined : groupIdByKey.get(routeCardOf(root)?.groupKey ?? "")
    return groupId === undefined ? [] : [[node.id, groupId] as const]
  }))
}

const listRouteParents = (context: CardContext): ParentIdById =>
  new Map([...listPartParents(ROUTE_KINDS)(context), ...listDecoratedParents(context)])

const namedTargetsOf = (slot: CodeBlock): CodeBlock[] =>
  slot.outerSymbols.flatMap((symbol) =>
    NAMING_USES.has(symbol.use) && (symbol.type === "internal-code-block" || symbol.type === "external-block") ? [symbol.codeBlockReference] : [])

const slotNodeIdsOf = (slot: CodeBlock, nodeIdByRootId: ReadonlyMap<string, string>): string[] =>
  [slot, ...namedTargetsOf(slot)].flatMap((block) => {
    const nodeId = nodeIdByRootId.get(block.id)
    return nodeId === undefined ? [] : [nodeId]
  })

const listRegistrations = (nodes: readonly JourneyNode[]): CodeBlock[] =>
  firstOfEach(nodes.filter(isRouteGroup).flatMap((node) => node.codeBlocks.filter(isRegistration)), (block) => block.id)

const listMiddlewareSteps = ({ nodes }: CardContext): { readonly groupId: string, readonly middlewareId: string, readonly handlerId: string }[] => {
  const nodeIdByRootId = new Map(nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const))
  const nodeIdByBlockId = nodeIdByBlockIdOf(nodes)
  return listRegistrations(nodes).flatMap((registration) => {
    const slots = registration.childrenBlocks.filter(isSlot)
    const nodeIdsOfPart = (part: CardPart): string[] => slots.filter((slot) => routeCardOf(slot)?.part === part).flatMap((slot) => slotNodeIdsOf(slot, nodeIdByRootId))
    const groupId = nodeIdByBlockId.get(registration.id) ?? ""
    return nodeIdsOfPart(MIDDLEWARE).flatMap((middlewareId) => nodeIdsOfPart(HANDLER).map((handlerId) => ({ groupId, middlewareId, handlerId })))
  })
}

const listMiddlewareEdges = (context: CardContext): JourneyNodeEdge[] =>
  listMiddlewareSteps(context).map(({ middlewareId, handlerId }) => toEdge(middlewareId, handlerId))

const listGroupToMiddlewareIds = (context: CardContext): ReadonlySet<string> => {
  const ids = listMiddlewareSteps(context).map(({ groupId, middlewareId }) => toEdge(groupId, middlewareId).id)
  return ids.length === 0 ? NOTHING_LEFT_OUT : new Set(ids)
}

export const routeCard: CardRules = {
  kind: "route",
  isNodeBlock: (block) => isRegistration(block) || isWrittenSlot(block),
  isNotNodeBlock: isNamingSlot,
  listParents: listRouteParents,
  listLeftOutNodeIds: () => NOTHING_LEFT_OUT,
  groupNodes: groupRouteNodes,
  listAddedEdges: listMiddlewareEdges,
  listLeftOutEdgeIds: listGroupToMiddlewareIds,
}
