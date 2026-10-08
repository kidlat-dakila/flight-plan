import type { ChangeType, DeclarationNode, EntryPointNode, JourneyEdge, JourneyFlow, JourneyNode, TracedName } from "@flightplan/configurations"

export const UI_CARD_HEADER_HEIGHT = 32
export const UI_FRAME_HEADER_HEIGHT = 32
const CARD_PADDING = 12
const FRAME_PADDING = 10
const FRAME_BODY_TOP = 8
const ITEM_GAP = 8
const DATA_LINE_HEIGHT = 22
const TRIGGER_HEIGHT = 44
const INNERMOST_FRAME_WIDTH = 420
const SHOWN_DATA_LIMIT = 6
const HALF = 2
const UI_CARD_ID_PREFIX = "ui:"
const KEY_SEPARATOR = "/"
const MEMBER_SEPARATOR = "."
const LINE_MARK = "@"
const CHANGE_TYPE_RANKS: Readonly<Record<ChangeType, number>> = { diff: 2, related: 1, none: 0 }

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface FrameLayout extends Box {
  readonly key: string
  readonly node: DeclarationNode | null
  readonly depth: number
  readonly name: string
  readonly declaration: string
  readonly path: string
  readonly conditionLabel: string | null
  readonly data: readonly TracedName[]
  readonly hiddenDataCount: number
}

export interface TriggerLayout extends Box {
  readonly key: string
  readonly entryPoint: EntryPointNode
  readonly eventNodeId: string
  readonly sublabel: string
}

export interface UiCardLayout {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly frames: readonly FrameLayout[]
  readonly triggers: readonly TriggerLayout[]
}

export interface CardPort {
  readonly key: string
  readonly cardId: string
  readonly y: number
  readonly onlyToId: string | null
}

interface TriggerSeed {
  readonly entryPoint: EntryPointNode
  readonly eventNodeId: string
  readonly sublabel: string
}

interface ComponentTree {
  readonly node: DeclarationNode | null
  readonly name: string
  readonly declaration: string
  readonly path: string
  readonly conditionLabel: string | null
  readonly triggers: readonly TriggerSeed[]
  readonly children: readonly ComponentTree[]
}

interface FrameParts {
  readonly frames: readonly FrameLayout[]
  readonly triggers: readonly TriggerLayout[]
  readonly height: number
}

interface FrameSlot {
  readonly key: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly depth: number
}

const isDeclaration = (node: JourneyNode): node is DeclarationNode => node.kind === "declaration"

const isEntryPoint = (node: JourneyNode): node is EntryPointNode => node.kind === "entry-point"

const isComponent = (node: JourneyNode): node is DeclarationNode => isDeclaration(node) && node.category === "ui"

const isHandler = (node: JourneyNode): node is DeclarationNode => isDeclaration(node) && node.category === "event"

const entryPointsLeadingTo = (flow: JourneyFlow, nodeId: string): EntryPointNode[] =>
  flow.nodes.filter(isEntryPoint).filter((entryPoint) => flow.edges.some((edge) => edge.from === entryPoint.id && edge.to === nodeId))

const triggerSeedsOf = (flow: JourneyFlow, component: DeclarationNode): TriggerSeed[] =>
  component.events.flatMap((event) => {
    const { nodeId } = event
    if (nodeId === null || !flow.nodes.some((node) => node.id === nodeId)) return []
    return entryPointsLeadingTo(flow, nodeId).map((entryPoint) => ({
      entryPoint,
      eventNodeId: nodeId,
      sublabel: `${event.name} :${String(event.reference[0])}`,
    }))
  })

const renderEdgesFrom = (flow: JourneyFlow, components: ReadonlyMap<string, DeclarationNode>, componentId: string): JourneyEdge[] =>
  flow.edges.filter((edge) => edge.from === componentId && components.has(edge.to))

const toComponentTree = (
  flow: JourneyFlow,
  components: ReadonlyMap<string, DeclarationNode>,
  component: DeclarationNode,
  conditionLabel: string | null,
  ancestorIds: ReadonlySet<string>,
): ComponentTree => {
  const withinIds = new Set([...ancestorIds, component.id])
  return {
    node: component,
    name: component.label ?? component.declaration,
    declaration: component.declaration,
    path: component.path,
    conditionLabel,
    triggers: triggerSeedsOf(flow, component),
    children: renderEdgesFrom(flow, components, component.id)
      .filter((edge) => !withinIds.has(edge.to))
      .flatMap((edge) => {
        const child = components.get(edge.to)
        return child === undefined ? [] : [toComponentTree(flow, components, child, edge.condition, withinIds)]
      }),
  }
}

const componentIdsIn = (tree: ComponentTree): string[] => [...(tree.node === null ? [] : [tree.node.id]), ...tree.children.flatMap(componentIdsIn)]

const eventNodeIdsIn = (tree: ComponentTree): string[] => [...tree.triggers.map((trigger) => trigger.eventNodeId), ...tree.children.flatMap(eventNodeIdsIn)]

const listRootComponents = (flow: JourneyFlow, components: ReadonlyMap<string, DeclarationNode>): DeclarationNode[] => {
  const renderedIds = new Set(flow.edges.filter((edge) => components.has(edge.from) && components.has(edge.to)).map((edge) => edge.to))
  return [...components.values()].filter((component) => !renderedIds.has(component.id))
}

const growTrees = (
  flow: JourneyFlow,
  components: ReadonlyMap<string, DeclarationNode>,
  roots: readonly DeclarationNode[],
  grown: readonly ComponentTree[],
): ComponentTree[] => {
  const trees = [...grown, ...roots.map((root) => toComponentTree(flow, components, root, null, new Set()))]
  const coveredIds = new Set(trees.flatMap(componentIdsIn))
  const uncovered = [...components.values()].find((component) => !coveredIds.has(component.id))
  return uncovered === undefined ? trees : growTrees(flow, components, [uncovered], trees)
}

const handlerNameOf = (handler: DeclarationNode): string => handler.declaration.slice(handler.declaration.lastIndexOf(MEMBER_SEPARATOR) + 1)

const lineLabelOf = (handler: DeclarationNode): string => {
  const markAt = handler.id.lastIndexOf(LINE_MARK)
  return markAt < 0 ? "" : ` :${handler.id.slice(markAt + 1)}`
}

const toLoneHandlerTree = (flow: JourneyFlow, handler: DeclarationNode): ComponentTree[] => {
  const entryPoints = entryPointsLeadingTo(flow, handler.id)
  if (entryPoints.length === 0) return []
  const namedUntil = handler.declaration.lastIndexOf(MEMBER_SEPARATOR)
  const componentName = namedUntil < 0 ? handler.declaration : handler.declaration.slice(0, namedUntil)
  return [
    {
      node: null,
      name: componentName,
      declaration: componentName,
      path: handler.path,
      conditionLabel: null,
      triggers: entryPoints.map((entryPoint) => ({ entryPoint, eventNodeId: handler.id, sublabel: `${handlerNameOf(handler)}${lineLabelOf(handler)}` })),
      children: [],
    },
  ]
}

const listComponentTrees = (flow: JourneyFlow): ComponentTree[] => {
  const components = new Map(flow.nodes.filter(isComponent).map((component) => [component.id, component]))
  const trees = growTrees(flow, components, listRootComponents(flow, components), [])
  const framedHandlerIds = new Set(trees.flatMap(eventNodeIdsIn))
  const loneHandlers = flow.nodes.filter(isHandler).filter((handler) => !framedHandlerIds.has(handler.id))
  return [...trees, ...loneHandlers.flatMap((handler) => toLoneHandlerTree(flow, handler))]
}

const strongerOf = (one: TracedName, two: TracedName): TracedName => (CHANGE_TYPE_RANKS[two.changeType] > CHANGE_TYPE_RANKS[one.changeType] ? two : one)

const namedOnce = (data: readonly TracedName[]): TracedName[] =>
  [...new Set(data.map((entry) => entry.name))].map((name) => data.filter((entry) => entry.name === name).reduce(strongerOf))

const readableDataOf = (component: DeclarationNode | null): TracedName[] => {
  if (component === null) return []
  const data = namedOnce(component.data)
  return component.changeType === "diff" ? data : data.filter((entry) => entry.changeType !== "none")
}

const depthOf = (tree: ComponentTree): number => 1 + Math.max(0, ...tree.children.map(depthOf))

const layoutFrame = (tree: ComponentTree, { key, x, y, width, depth }: FrameSlot): FrameParts => {
  const data = readableDataOf(tree.node)
  const innerX = x + FRAME_PADDING
  const innerWidth = width - FRAME_PADDING * HALF
  const bodyTop = y + UI_FRAME_HEADER_HEIGHT + FRAME_BODY_TOP
  const triggersTop = data.length === 0 ? bodyTop : bodyTop + DATA_LINE_HEIGHT + ITEM_GAP
  const triggers = tree.triggers.map((trigger, position): TriggerLayout => ({
    ...trigger,
    key: [key, trigger.entryPoint.id, String(position)].join(KEY_SEPARATOR),
    x: innerX,
    y: triggersTop + position * (TRIGGER_HEIGHT + ITEM_GAP),
    width: innerWidth,
    height: TRIGGER_HEIGHT,
  }))
  const childrenTop = triggersTop + triggers.length * (TRIGGER_HEIGHT + ITEM_GAP)
  const children = tree.children.reduce<{ readonly parts: readonly FrameParts[], readonly top: number }>(
    ({ parts, top }, child, position) => {
      const laid = layoutFrame(child, { key: [key, String(position)].join(KEY_SEPARATOR), x: innerX, y: top, width: innerWidth, depth: depth + 1 })
      return { parts: [...parts, laid], top: top + laid.height + ITEM_GAP }
    },
    { parts: [], top: childrenTop },
  )
  const isEmpty = data.length === 0 && triggers.length === 0 && tree.children.length === 0
  const height = isEmpty ? UI_FRAME_HEADER_HEIGHT : children.top - ITEM_GAP + FRAME_PADDING - y
  const frame: FrameLayout = {
    key,
    node: tree.node,
    depth,
    name: tree.name,
    declaration: tree.declaration,
    path: tree.path,
    conditionLabel: tree.conditionLabel,
    data: data.slice(0, SHOWN_DATA_LIMIT),
    hiddenDataCount: Math.max(0, data.length - SHOWN_DATA_LIMIT),
    x,
    y,
    width,
    height,
  }
  return {
    frames: [frame, ...children.parts.flatMap((part) => part.frames)],
    triggers: [...triggers, ...children.parts.flatMap((part) => part.triggers)],
    height,
  }
}

const toCardLayout = (tree: ComponentTree, position: number): UiCardLayout => {
  const handlerIds = tree.triggers.map((trigger) => trigger.eventNodeId)
  const id = `${UI_CARD_ID_PREFIX}${tree.node?.id ?? (handlerIds.length > 0 ? handlerIds[0] : String(position))}`
  const frameWidth = INNERMOST_FRAME_WIDTH + (depthOf(tree) - 1) * FRAME_PADDING * HALF
  const parts = layoutFrame(tree, { key: id, x: CARD_PADDING, y: UI_CARD_HEADER_HEIGHT + CARD_PADDING, width: frameWidth, depth: 0 })
  return {
    id,
    width: frameWidth + CARD_PADDING * HALF,
    height: UI_CARD_HEADER_HEIGHT + CARD_PADDING * HALF + parts.height,
    frames: parts.frames,
    triggers: parts.triggers,
  }
}

export const layoutUiCards = (flow: JourneyFlow): UiCardLayout[] => listComponentTrees(flow).map(toCardLayout)

const framePortsOf = (card: UiCardLayout): [string, CardPort][] =>
  card.frames.flatMap(({ node, key, y }): [string, CardPort][] =>
    node === null ? [] : [[node.id, { key, cardId: card.id, y: y + UI_FRAME_HEADER_HEIGHT / HALF, onlyToId: null }]])

const triggerPortsOf = (card: UiCardLayout): [string, CardPort][] =>
  card.triggers.map(({ entryPoint, key, y, height, eventNodeId }): [string, CardPort] =>
    [entryPoint.id, { key, cardId: card.id, y: y + height / HALF, onlyToId: eventNodeId }])

export const listCardPorts = (cards: readonly UiCardLayout[]): ReadonlyMap<string, readonly CardPort[]> => {
  const ports = cards.flatMap((card) => [...framePortsOf(card), ...triggerPortsOf(card)])
  return new Map([...new Set(ports.map(([nodeId]) => nodeId))].map((nodeId) => [nodeId, ports.filter(([id]) => id === nodeId).map(([, port]) => port)]))
}
