import { compareRanges } from "@/code-blocks/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import type { BlockCard, CardKind, CardPart, CodeBlock, JourneyNode, JourneyNodeEdge } from "@flightplan/configurations"
import { isController, isMethodOfClass } from "./class"
import { filePathOfNode, NOTHING_LEFT_OUT, rootBlockOfNode } from "./nodes"
import { cardOfKind, listPartParents, nodeIdByBlockIdOf, toEdge } from "./parts"
import type { CardContext, CardRules, NodeGroup, ParentIdById } from "./types"

const ROUTE_KINDS: readonly CardKind[] = ["route"]
const HOLDER: CardPart = "holder"
const HANDLER: CardPart = "handler"
const MIDDLEWARE: CardPart = "middleware"
const PAGE: CardPart = "page"
const MOUNT: CardPart = "mount"
const ROUTE_TYPE = "route"
const EFFECT = "effect"
const ROOT_VARIABLE = "root-variable"
const GROUP_ID_MARK = "#route@"
const NAMING_USES: ReadonlySet<string> = new Set(["value", "read"])
const CALLING = "call"
const CLASS: CodeBlock["type"] = "class"
const ARGUMENT_TYPES: ReadonlySet<CodeBlock["type"]> = new Set<CodeBlock["type"]>(["root-argument-value", "variable"])
const PLUGIN_TYPES: ReadonlySet<CodeBlock["type"]> = new Set<CodeBlock["type"]>(["function"])
const CALL_RECEIVER_OFFSET = 0
const DECORATOR_RECEIVER_OFFSET = 1
const RECEIVER_OFFSETS: ReadonlySet<number> = new Set([CALL_RECEIVER_OFFSET, DECORATOR_RECEIVER_OFFSET])

const routeCardOf = (block: CodeBlock): BlockCard | null => cardOfKind(block, ROUTE_KINDS)

export const isRegistration = (block: CodeBlock): boolean => routeCardOf(block)?.part === HOLDER

const isSlot = (block: CodeBlock): boolean => {
  const part = routeCardOf(block)?.part
  return (part === HANDLER || part === MIDDLEWARE) && block.parentBlock !== null && isRegistration(block.parentBlock)
}

const isRouterWideMiddleware = (block: CodeBlock): boolean => routeCardOf(block)?.part === MIDDLEWARE && block.card?.routePaths !== undefined

const isRouterWideSlot = (block: CodeBlock): boolean => isRouterWideMiddleware(block) && block.parentBlock !== null

const isNamingSlot = (block: CodeBlock): boolean => (isSlot(block) || isRouterWideSlot(block)) && block.childrenBlocks.length === 0

const isWrittenSlot = (block: CodeBlock): boolean => (isSlot(block) || isRouterWideSlot(block)) && block.childrenBlocks.length > 0

const isDecoratedHandler = (block: CodeBlock): boolean =>
  routeCardOf(block)?.part === HANDLER && (block.parentBlock === null || isMethodOfClass(block)) && (block.cardOwner ?? null) === null

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

const groupIdByKeyOf = (nodes: readonly JourneyNode[]): ReadonlyMap<string, string> =>
  new Map(nodes.filter(isRouteGroup).map((node) => [routeCardOf(rootBlockOfNode(node))?.groupKey ?? "", node.id] as const))

const listDecoratedParents = ({ nodes }: CardContext): ParentIdById => {
  const groupIdByKey = groupIdByKeyOf(nodes)
  return new Map(nodes.flatMap((node) => {
    const root = rootBlockOfNode(node)
    const groupId = isRouteGroup(node) || !isDecoratedHandler(root) ? undefined : groupIdByKey.get(routeCardOf(root)?.groupKey ?? "")
    return groupId === undefined ? [] : [[node.id, groupId] as const]
  }))
}

const nodeIdsOfDecoratedHandlers = ({ nodes }: CardContext): ReadonlySet<string> =>
  new Set(nodes.filter((node) => isDecoratedHandler(rootBlockOfNode(node))).map((node) => node.id))

const listRouteParents = (context: CardContext): ParentIdById => {
  const decoratedIds = nodeIdsOfDecoratedHandlers(context)
  const partParents = [...listPartParents(ROUTE_KINDS)(context)].filter(([nodeId]) => !decoratedIds.has(nodeId))
  return new Map([...partParents, ...listDecoratedParents(context)])
}

const isNamingOrMaking = (use: string, target: CodeBlock): boolean => NAMING_USES.has(use) || (use === CALLING && target.type === CLASS)

const namedTargetsOf = (slot: CodeBlock): CodeBlock[] =>
  slot.outerSymbols.flatMap((symbol) =>
    (symbol.type === "internal-code-block" || symbol.type === "external-block") && isNamingOrMaking(symbol.use, symbol.codeBlockReference) ? [symbol.codeBlockReference] : [])

const slotNodeIdsOf = (slot: CodeBlock, nodeIdByRootId: ReadonlyMap<string, string>): string[] =>
  [slot, ...namedTargetsOf(slot)].flatMap((block) => {
    const nodeId = nodeIdByRootId.get(block.id)
    return nodeId === undefined ? [] : [nodeId]
  })

const listRegistrations = (nodes: readonly JourneyNode[]): CodeBlock[] =>
  firstOfEach(nodes.filter(isRouteGroup).flatMap((node) => node.codeBlocks.filter(isRegistration)), (block) => block.id)

interface MiddlewareStep {
  readonly groupId: string
  readonly middlewareId: string
  readonly handlerId: string
}

const isOwnedMiddleware = (block: CodeBlock): boolean => {
  const owner = block.cardOwner ?? null
  return routeCardOf(block)?.part === MIDDLEWARE && owner !== null && isDecoratedHandler(owner)
}

const listOwnedMiddlewareSteps = (nodes: readonly JourneyNode[], nodeIdByRootId: ReadonlyMap<string, string>): MiddlewareStep[] =>
  nodes.flatMap((node) =>
    node.codeBlocks.filter(isOwnedMiddleware).flatMap((slot) =>
      namedTargetsOf(slot).flatMap((target) => {
        const middlewareId = nodeIdByRootId.get(target.id)
        return middlewareId === undefined ? [] : [{ groupId: node.id, middlewareId, handlerId: node.id }]
      })))

const listRegisteredMiddlewareSteps = (nodes: readonly JourneyNode[], nodeIdByRootId: ReadonlyMap<string, string>): MiddlewareStep[] => {
  const nodeIdByBlockId = nodeIdByBlockIdOf(nodes)
  return listRegistrations(nodes).flatMap((registration) => {
    const slots = registration.childrenBlocks.filter(isSlot)
    const nodeIdsOfPart = (part: CardPart): string[] => slots.filter((slot) => routeCardOf(slot)?.part === part).flatMap((slot) => slotNodeIdsOf(slot, nodeIdByRootId))
    const groupId = nodeIdByBlockId.get(registration.id) ?? ""
    return nodeIdsOfPart(MIDDLEWARE).flatMap((middlewareId) => nodeIdsOfPart(HANDLER).map((handlerId) => ({ groupId, middlewareId, handlerId })))
  })
}

const listMiddlewareSteps = ({ nodes }: CardContext): MiddlewareStep[] => {
  const nodeIdByRootId = new Map(nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const))
  return [...listRegisteredMiddlewareSteps(nodes, nodeIdByRootId), ...listOwnedMiddlewareSteps(nodes, nodeIdByRootId)]
}

const listMiddlewareEdges = (context: CardContext): JourneyNodeEdge[] =>
  listMiddlewareSteps(context).map(({ middlewareId, handlerId }) => toEdge(middlewareId, handlerId))

const routePathsAt = (block: CodeBlock): string[] =>
  [...new Set([block, ...block.usedBy].filter(isRouterWideMiddleware).flatMap((middleware) => middleware.card?.routePaths ?? []))]

const isPageNode = (node: JourneyNode): boolean => routeCardOf(rootBlockOfNode(node))?.part === PAGE

const listRouterWideEdges = ({ nodes }: CardContext): JourneyNodeEdge[] => {
  const reached = nodes.filter((node) => isRouteGroup(node) || isPageNode(node))
  const reachedIdsByPath = groupBy(reached, (node) => routeCardOf(rootBlockOfNode(node))?.groupKey ?? "")
  return nodes.flatMap((node) =>
    routePathsAt(rootBlockOfNode(node)).flatMap((path) =>
      (reachedIdsByPath.get(path) ?? []).filter((target) => target.id !== node.id).map((target) => toEdge(node.id, target.id))))
}

const listControllerEdges = ({ nodes }: CardContext): JourneyNodeEdge[] => {
  const nodeIdByRootId = new Map(nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const))
  const groupIdByKey = groupIdByKeyOf(nodes)
  return nodes.flatMap((node) => {
    const root = rootBlockOfNode(node)
    const controller = isRouteGroup(node) || !isDecoratedHandler(root) ? null : root.parentBlock
    const controllerId = controller !== null && isController(controller) ? nodeIdByRootId.get(controller.id) : undefined
    const groupId = groupIdByKey.get(routeCardOf(root)?.groupKey ?? "")
    return controllerId === undefined || groupId === undefined ? [] : [toEdge(controllerId, groupId)]
  })
}

interface RouterStep {
  readonly routerId: string
  readonly registeredId: string
  readonly routeCardId: string
}

const isReceiverOf = (registration: CodeBlock, usedAt: CodeBlock["lineOfCodeRangeReference"][number]): boolean => {
  const { start } = registration.lineOfCodeRangeReference[0]
  return usedAt.start.line === start.line && RECEIVER_OFFSETS.has(usedAt.start.column - start.column)
}

const routerOf = (registration: CodeBlock): CodeBlock | null =>
  registration.outerSymbols.flatMap((symbol) =>
    (symbol.type === "internal-code-block" || symbol.type === "external-block")
    && symbol.codeBlockReference.type === ROOT_VARIABLE
    && isReceiverOf(registration, symbol.usedAt)
      ? [symbol.codeBlockReference]
      : [])[0] ?? null

const registrationsOfNode = (node: JourneyNode): CodeBlock[] => {
  const root = rootBlockOfNode(node)
  if (isRouteGroup(node)) return node.codeBlocks.filter(isRegistration)
  return isDecoratedHandler(root) ? [root] : []
}

const listRouterSteps = ({ nodes }: CardContext): RouterStep[] => {
  const nodeIdByRootId = new Map(nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const))
  const groupIdByKey = groupIdByKeyOf(nodes)
  return nodes.flatMap((node) => {
    const routeCardId = isRouteGroup(node) ? node.id : groupIdByKey.get(routeCardOf(rootBlockOfNode(node))?.groupKey ?? "")
    return registrationsOfNode(node).flatMap((registration) => {
      const router = routerOf(registration)
      const routerId = router === null ? undefined : nodeIdByRootId.get(router.id)
      return routerId === undefined || routeCardId === undefined ? [] : [{ routerId, registeredId: node.id, routeCardId }]
    })
  })
}

const listRouterEdges = (context: CardContext): JourneyNodeEdge[] =>
  firstOfEach(listRouterSteps(context).map(({ routerId, routeCardId }) => toEdge(routerId, routeCardId)), (edge) => edge.id)

const listRouteAddedEdges = (context: CardContext): JourneyNodeEdge[] =>
  [...listMiddlewareEdges(context), ...listRouterWideEdges(context), ...listControllerEdges(context), ...listRouterEdges(context)]

const listControllerToHandlerIds = ({ nodes }: CardContext): string[] => {
  const nodeIdByRootId = new Map(nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const))
  return nodes.flatMap((node) => {
    const root = rootBlockOfNode(node)
    const controllerId = isDecoratedHandler(root) && root.parentBlock !== null ? nodeIdByRootId.get(root.parentBlock.id) : undefined
    return controllerId === undefined ? [] : [toEdge(controllerId, node.id).id]
  })
}

const listWithin = (block: CodeBlock): CodeBlock[] => block.childrenBlocks.flatMap((child) => [child, ...listWithin(child)])

const listControllerToMiddlewareIds = ({ nodes }: CardContext): string[] => {
  const nodeIdByRootId = new Map(nodes.map((node) => [rootBlockOfNode(node).id, node.id] as const))
  return nodes.filter((node) => isController(rootBlockOfNode(node))).flatMap((node) =>
    listWithin(rootBlockOfNode(node))
      .filter(isRouterWideMiddleware)
      .flatMap((slot) => slotNodeIdsOf(slot, nodeIdByRootId))
      .map((middlewareId) => toEdge(node.id, middlewareId).id))
}

const listRouteLeftOutEdgeIds = (context: CardContext): ReadonlySet<string> => {
  const ids = [
    ...listMiddlewareSteps(context).map(({ groupId, middlewareId }) => toEdge(groupId, middlewareId).id),
    ...listControllerToHandlerIds(context),
    ...listControllerToMiddlewareIds(context),
    ...listRouterSteps(context).map(({ registeredId, routerId }) => toEdge(registeredId, routerId).id),
  ]
  return ids.length === 0 ? NOTHING_LEFT_OUT : new Set(ids)
}

const isNamingMiddleware = (block: CodeBlock): boolean => routeCardOf(block)?.part === MIDDLEWARE && block.childrenBlocks.length === 0

const handsOnly = (block: CodeBlock, isHanded: (child: CodeBlock) => boolean): boolean => block.childrenBlocks.length > 0 && block.childrenBlocks.every(isHanded)

const isCallHandingMiddleware = (block: CodeBlock): boolean => block.type === EFFECT && handsOnly(block, isNamingMiddleware)

const isMountBlock = (block: CodeBlock): boolean => routeCardOf(block)?.part === MOUNT

const handsMiddlewareThroughCalls = (block: CodeBlock): boolean =>
  (block.type === ROOT_VARIABLE || isMountBlock(block)) && handsOnly(block, (child) => isNamingMiddleware(child) || isCallHandingMiddleware(child))

const isHandingMiddleware = (block: CodeBlock): boolean => handsOnly(block, isNamingMiddleware) || handsMiddlewareThroughCalls(block)

const isRouteCardBlock = (block: CodeBlock): boolean => routeCardOf(block) !== null

const isArgumentBlock = (block: CodeBlock): boolean => ARGUMENT_TYPES.has(block.type)

const onlyRegistersRoutes = (block: CodeBlock): boolean => {
  const statements = block.childrenBlocks.filter((child) => !isArgumentBlock(child))
  return (PLUGIN_TYPES.has(block.type) || (block.type === ROOT_VARIABLE && block.parentBlock === null)) && statements.length > 0 && statements.every(isRouteCardBlock)
}

const listPluginNodeIds = ({ nodes }: CardContext): ReadonlySet<string> => {
  const ids = nodes.filter((node) => onlyRegistersRoutes(rootBlockOfNode(node))).map((node) => node.id)
  return ids.length === 0 ? NOTHING_LEFT_OUT : new Set(ids)
}

export const routeCard: CardRules = {
  kind: "route",
  isNodeBlock: (block) => isRegistration(block) || isWrittenSlot(block),
  isNotNodeBlock: (block) => isNamingSlot(block) || isHandingMiddleware(block),
  listParents: listRouteParents,
  listLeftOutNodeIds: listPluginNodeIds,
  groupNodes: groupRouteNodes,
  listAddedEdges: listRouteAddedEdges,
  listLeftOutEdgeIds: listRouteLeftOutEdgeIds,
}
