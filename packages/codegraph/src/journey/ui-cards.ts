import type { ChangeType, ComponentReturn, DeclarationNode, EntryPointNode, JourneyEdge, JourneyFlow, JourneyNode, LineSpan, TracedName } from "@flightplan/configurations"

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
const DIFF: ChangeType = "diff"
const UNCHANGED: ChangeType = "none"
const STACK_RANKS: Readonly<Record<PartRowKind | TriggerKind, number>> = { "data-fetch": 0, "hook": 1, "effect": 2, "event": 3 }
const CHANGE_TYPE_RANKS: Readonly<Record<ChangeType, number>> = { diff: 2, related: 1, none: 0 }

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type FrameRole = "component" | "return" | "group"

export type FramePartKind = "state"

export type PartRowKind = "data-fetch" | "hook" | "effect"

export interface FramePart {
  readonly kind: FramePartKind
  readonly names: readonly TracedName[]
}

export interface FrameLayout extends Box {
  readonly key: string
  readonly role: FrameRole
  readonly node: DeclarationNode | null
  readonly componentReturn: ComponentReturn | null
  readonly depth: number
  readonly name: string
  readonly declaration: string
  readonly path: string
  readonly parts: readonly FramePart[]
  readonly data: readonly TracedName[]
  readonly hiddenDataCount: number
}

export interface PartRowLayout extends Box {
  readonly key: string
  readonly kind: PartRowKind
  readonly name: string
  readonly line: number
  readonly changeType: ChangeType
  readonly ownerNodeId: string
}

export type TriggerKind = "data-fetch" | "effect" | "event"

export interface TriggerLayout extends Box {
  readonly key: string
  readonly kind: TriggerKind
  readonly entryPoint: EntryPointNode
  readonly eventNodeId: string
  readonly sublabel: string
}

export interface UiCardLayout {
  readonly id: string
  readonly width: number
  readonly height: number
  readonly declaration: string
  readonly path: string
  readonly headerNode: DeclarationNode | null
  readonly frames: readonly FrameLayout[]
  readonly rows: readonly PartRowLayout[]
  readonly triggers: readonly TriggerLayout[]
}

export interface CardPort {
  readonly key: string
  readonly cardId: string
  readonly y: number
  readonly onlyToId: string | null
}

interface TriggerSeed {
  readonly kind: TriggerKind
  readonly entryPoint: EntryPointNode
  readonly eventNodeId: string
  readonly sublabel: string
  readonly line: number | null
}

interface PartRowSeed {
  readonly kind: PartRowKind
  readonly name: string
  readonly line: number
  readonly changeType: ChangeType
  readonly ownerNodeId: string
}

interface FrameTree {
  readonly role: FrameRole
  readonly node: DeclarationNode | null
  readonly componentReturn: ComponentReturn | null
  readonly name: string
  readonly declaration: string
  readonly path: string
  readonly parts: readonly FramePart[]
  readonly data: readonly TracedName[]
  readonly rows: readonly PartRowSeed[]
  readonly triggers: readonly TriggerSeed[]
  readonly children: readonly FrameTree[]
}

interface Stacked {
  readonly parts: readonly FrameParts[]
  readonly bottom: number
}

interface ComponentTree {
  readonly rows: readonly PartRowSeed[]
  readonly node: DeclarationNode | null
  readonly name: string
  readonly declaration: string
  readonly path: string
  readonly triggers: readonly TriggerSeed[]
  readonly children: readonly ComponentTree[]
}

interface FrameParts {
  readonly frames: readonly FrameLayout[]
  readonly rows: readonly PartRowLayout[]
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

const isHandler = (node: JourneyNode): node is DeclarationNode => isDeclaration(node) && (node.category === "event" || node.category === "effect")

const rowSeedsOf = (kind: PartRowKind, names: readonly TracedName[], ownerNodeId: string): PartRowSeed[] =>
  names.map(({ name, changeType, reference }) => ({ kind, name, line: reference[0], changeType, ownerNodeId }))

const entryPointsLeadingTo = (flow: JourneyFlow, nodeId: string): EntryPointNode[] =>
  flow.nodes.filter(isEntryPoint).filter((entryPoint) => flow.edges.some((edge) => edge.from === entryPoint.id && edge.to === nodeId))

const seedsOfKind = (flow: JourneyFlow, kind: TriggerKind, events: DeclarationNode["events"]): TriggerSeed[] =>
  events.flatMap((event) => {
    const { nodeId } = event
    if (nodeId === null || !flow.nodes.some((node) => node.id === nodeId)) return []
    return entryPointsLeadingTo(flow, nodeId).map((entryPoint) => ({
      kind,
      entryPoint,
      eventNodeId: nodeId,
      sublabel: `${event.name} :${String(event.reference[0])}`,
      line: event.reference[0],
    }))
  })

const rowsOf = (flow: JourneyFlow, { id, dataFetches, hooks, effects }: DeclarationNode): PartRowSeed[] => [
  ...rowSeedsOf("data-fetch", dataFetches.filter((part) => !isTriggered(flow, part)), id),
  ...rowSeedsOf("hook", hooks, id),
  ...rowSeedsOf("effect", effects.filter((part) => !isTriggered(flow, part)), id),
]

const triggerSeedsOf = (flow: JourneyFlow, component: DeclarationNode): TriggerSeed[] => [
  ...seedsOfKind(flow, "data-fetch", component.dataFetches),
  ...seedsOfKind(flow, "effect", component.effects),
  ...seedsOfKind(flow, "event", component.events),
]

const isTriggered = (flow: JourneyFlow, { nodeId }: DeclarationNode["events"][number]): boolean =>
  nodeId !== null && flow.nodes.some((node) => node.id === nodeId) && entryPointsLeadingTo(flow, nodeId).length > 0

const renderEdgesFrom = (flow: JourneyFlow, components: ReadonlyMap<string, DeclarationNode>, componentId: string): JourneyEdge[] =>
  flow.edges.filter((edge) => edge.from === componentId && components.has(edge.to))

const toComponentTree = (
  flow: JourneyFlow,
  components: ReadonlyMap<string, DeclarationNode>,
  component: DeclarationNode,
  ancestorIds: ReadonlySet<string>,
): ComponentTree => {
  const withinIds = new Set([...ancestorIds, component.id])
  return {
    rows: rowsOf(flow, component),
    node: component,
    name: component.label ?? component.declaration,
    declaration: component.declaration,
    path: component.path,
    triggers: triggerSeedsOf(flow, component),
    children: renderEdgesFrom(flow, components, component.id)
      .filter((edge) => !withinIds.has(edge.to))
      .flatMap((edge) => {
        const child = components.get(edge.to)
        return child === undefined ? [] : [toComponentTree(flow, components, child, withinIds)]
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
  const trees = [...grown, ...roots.map((root) => toComponentTree(flow, components, root, new Set()))]
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
      rows: [],
      node: null,
      name: componentName,
      declaration: componentName,
      path: handler.path,
      triggers: entryPoints.map((entryPoint) => ({ kind: handler.category === "effect" ? "effect" as const : "event" as const, entryPoint, eventNodeId: handler.id, sublabel: `${handlerNameOf(handler)}${lineLabelOf(handler)}`, line: null })),
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

const listedDataOf = (data: readonly TracedName[], isEveryNameListed: boolean): TracedName[] => {
  const named = namedOnce(data)
  return isEveryNameListed ? named : named.filter((entry) => entry.changeType !== UNCHANGED)
}

const NO_PARTS: readonly FramePart[] = []

const NO_ROWS: readonly PartRowSeed[] = []

const partsOf = ({ states }: DeclarationNode): FramePart[] => {
  const parts: readonly FramePart[] = [{ kind: "state", names: namedOnce(states) }]
  return parts.filter((part) => part.names.length > 0)
}

const isUserAction = ({ kind }: TriggerSeed): boolean => kind === "event"

const isOnLines = ([startLine, endLine]: LineSpan, line: number | null): boolean => line !== null && startLine <= line && line <= endLine

const isRenderedIn = ({ renderedNodeIds }: ComponentReturn, { node }: FrameTree): boolean => node !== null && renderedNodeIds.includes(node.id)

const toReturnFrame = (tree: ComponentTree, node: DeclarationNode, children: readonly FrameTree[], componentReturn: ComponentReturn): FrameTree => ({
  role: "return",
  node,
  componentReturn,
  name: componentReturn.label ?? componentReturn.statement,
  declaration: tree.declaration,
  path: tree.path,
  parts: NO_PARTS,
  data: listedDataOf(node.data.filter((entry) => isOnLines(componentReturn.reference, entry.reference[0])), componentReturn.changeType === DIFF),
  rows: NO_ROWS,
  triggers: tree.triggers.filter((trigger) => isOnLines(componentReturn.reference, trigger.line)),
  children: componentReturn.renderedNodeIds.flatMap((nodeId) => children.filter((child) => child.node?.id === nodeId)),
})

const toSoleReturnFrame = (tree: ComponentTree, node: DeclarationNode, children: readonly FrameTree[]): FrameTree => ({
  role: "return",
  node,
  componentReturn: null,
  name: tree.name,
  declaration: tree.declaration,
  path: tree.path,
  parts: NO_PARTS,
  data: listedDataOf(node.data, node.changeType === DIFF),
  rows: NO_ROWS,
  triggers: tree.triggers.filter(isUserAction),
  children,
})

const toGroupFrame = (tree: ComponentTree, node: DeclarationNode, children: readonly FrameTree[]): FrameTree => {
  const isOutsideEveryReturn = (line: number | null): boolean => node.returns.every((componentReturn) => !isOnLines(componentReturn.reference, line))
  const shared = { role: "group" as const, node, componentReturn: null, name: tree.name, declaration: tree.declaration, path: tree.path, parts: partsOf(node), data: [], rows: tree.rows }
  if (node.returns.length === 0) return { ...shared, triggers: tree.triggers.filter((trigger) => !isUserAction(trigger)), children: [toSoleReturnFrame(tree, node, children)] }
  return {
    ...shared,
    triggers: tree.triggers.filter((trigger) => isOutsideEveryReturn(trigger.line)),
    children: [
      ...node.returns.map((componentReturn) => toReturnFrame(tree, node, children, componentReturn)),
      ...children.filter((child) => node.returns.every((componentReturn) => !isRenderedIn(componentReturn, child))),
    ],
  }
}

function toNestedFrameTree(tree: ComponentTree): FrameTree {
  return toFrameTree(tree, false)
}

function toFrameTree(tree: ComponentTree, isTopMost: boolean): FrameTree {
  const { node } = tree
  const children = tree.children.map(toNestedFrameTree)
  if (node !== null && (node.returns.length > 0 || !isTopMost)) return toGroupFrame(tree, node, children)
  return {
    role: "component",
    node,
    componentReturn: null,
    name: tree.name,
    declaration: tree.declaration,
    path: tree.path,
    parts: node === null ? NO_PARTS : partsOf(node),
    data: node === null ? [] : listedDataOf(node.data, node.changeType === DIFF),
    rows: tree.rows,
    triggers: tree.triggers,
    children,
  }
}

const depthOf = (tree: FrameTree): number => 1 + Math.max(0, ...tree.children.map(depthOf))

function stackFrames(trees: readonly FrameTree[], { key, x, y, width, depth }: FrameSlot): Stacked {
  return trees.reduce<Stacked>(
    ({ parts, bottom }, tree, position) => {
      const laid = layoutFrame(tree, { key: [key, String(position)].join(KEY_SEPARATOR), x, y: bottom, width, depth })
      return { parts: [...parts, laid], bottom: bottom + laid.height + ITEM_GAP }
    },
    { parts: [], bottom: y },
  )
}

function layoutFrame(tree: FrameTree, { key, x, y, width, depth }: FrameSlot): FrameParts {
  const { data, parts } = tree
  const innerX = x + FRAME_PADDING
  const innerWidth = width - FRAME_PADDING * HALF
  const bodyTop = y + UI_FRAME_HEADER_HEIGHT + FRAME_BODY_TOP
  const dataTop = bodyTop + parts.length * (DATA_LINE_HEIGHT + ITEM_GAP)
  const stackTop = data.length === 0 ? dataTop : dataTop + DATA_LINE_HEIGHT + ITEM_GAP
  const stacked = [...tree.rows.map((row) => ({ kind: row.kind, row, trigger: null })), ...tree.triggers.map((trigger) => ({ kind: trigger.kind, row: null, trigger }))]
    .map((seed, order) => ({ ...seed, order }))
    .sort((one, two) => STACK_RANKS[one.kind] - STACK_RANKS[two.kind] || one.order - two.order)
  const stackedAt = (position: number): Box => ({ x: innerX, y: stackTop + position * (TRIGGER_HEIGHT + ITEM_GAP), width: innerWidth, height: TRIGGER_HEIGHT })
  const rows = stacked.flatMap(({ row }, position): PartRowLayout[] =>
    row === null ? [] : [{ ...row, ...stackedAt(position), key: [key, row.kind, String(position)].join(KEY_SEPARATOR) }])
  const triggers = stacked.flatMap(({ trigger, order }, position): TriggerLayout[] =>
    trigger === null
      ? []
      : [{
          ...stackedAt(position),
          kind: trigger.kind,
          entryPoint: trigger.entryPoint,
          eventNodeId: trigger.eventNodeId,
          sublabel: trigger.sublabel,
          key: [key, trigger.entryPoint.id, String(order - tree.rows.length)].join(KEY_SEPARATOR),
        }])
  const childrenTop = stackTop + stacked.length * (TRIGGER_HEIGHT + ITEM_GAP)
  const children = stackFrames(tree.children, { key, x: innerX, y: childrenTop, width: innerWidth, depth: depth + 1 })
  const isEmpty = data.length === 0 && parts.length === 0 && rows.length === 0 && triggers.length === 0 && tree.children.length === 0
  const height = isEmpty ? UI_FRAME_HEADER_HEIGHT : children.bottom - ITEM_GAP + FRAME_PADDING - y
  const frame: FrameLayout = {
    key,
    role: tree.role,
    node: tree.node,
    componentReturn: tree.componentReturn,
    depth,
    name: tree.name,
    declaration: tree.declaration,
    path: tree.path,
    parts,
    data: data.slice(0, SHOWN_DATA_LIMIT),
    hiddenDataCount: Math.max(0, data.length - SHOWN_DATA_LIMIT),
    x,
    y,
    width,
    height,
  }
  return {
    frames: [frame, ...children.parts.flatMap((part) => part.frames)],
    rows: [...rows, ...children.parts.flatMap((part) => part.rows)],
    triggers: [...triggers, ...children.parts.flatMap((part) => part.triggers)],
    height,
  }
}

const isHeadedByCard = (tree: FrameTree): boolean =>
  tree.role === "group" && tree.triggers.length === 0 && tree.parts.length === 0 && tree.rows.length === 0

const layoutCardBody = (tree: FrameTree, slot: FrameSlot): FrameParts => {
  if (!isHeadedByCard(tree)) return layoutFrame(tree, slot)
  const stacked = stackFrames(tree.children, slot)
  return {
    frames: stacked.parts.flatMap((part) => part.frames),
    rows: stacked.parts.flatMap((part) => part.rows),
    triggers: stacked.parts.flatMap((part) => part.triggers),
    height: stacked.bottom - ITEM_GAP - slot.y,
  }
}

const toCardLayout = (componentTree: ComponentTree, position: number): UiCardLayout => {
  const tree = toFrameTree(componentTree, true)
  const handlerIds = tree.triggers.map((trigger) => trigger.eventNodeId)
  const id = `${UI_CARD_ID_PREFIX}${tree.node?.id ?? (handlerIds.length > 0 ? handlerIds[0] : String(position))}`
  const frameDepth = isHeadedByCard(tree) ? Math.max(...tree.children.map(depthOf)) : depthOf(tree)
  const frameWidth = INNERMOST_FRAME_WIDTH + (frameDepth - 1) * FRAME_PADDING * HALF
  const parts = layoutCardBody(tree, { key: id, x: CARD_PADDING, y: UI_CARD_HEADER_HEIGHT + CARD_PADDING, width: frameWidth, depth: 0 })
  return {
    id,
    width: frameWidth + CARD_PADDING * HALF,
    height: UI_CARD_HEADER_HEIGHT + CARD_PADDING * HALF + parts.height,
    declaration: tree.declaration,
    path: tree.path,
    headerNode: isHeadedByCard(tree) ? tree.node : null,
    frames: parts.frames,
    rows: parts.rows,
    triggers: parts.triggers,
  }
}

export const layoutUiCards = (flow: JourneyFlow): UiCardLayout[] => listComponentTrees(flow).map(toCardLayout)

const framePortsOf = (card: UiCardLayout): [string, CardPort][] =>
  card.frames.flatMap(({ node, role, key, y }): [string, CardPort][] =>
    node === null || role === "return" ? [] : [[node.id, { key, cardId: card.id, y: y + UI_FRAME_HEADER_HEIGHT / HALF, onlyToId: null }]])

const headerPortsOf = ({ id, headerNode }: UiCardLayout): [string, CardPort][] =>
  headerNode === null ? [] : [[headerNode.id, { key: id, cardId: id, y: UI_CARD_HEADER_HEIGHT / HALF, onlyToId: null }]]

const triggerPortsOf = (card: UiCardLayout): [string, CardPort][] =>
  card.triggers.map(({ entryPoint, key, y, height, eventNodeId }): [string, CardPort] =>
    [entryPoint.id, { key, cardId: card.id, y: y + height / HALF, onlyToId: eventNodeId }])

export const listCardPorts = (cards: readonly UiCardLayout[]): ReadonlyMap<string, readonly CardPort[]> => {
  const ports = cards.flatMap((card) => [...headerPortsOf(card), ...framePortsOf(card), ...triggerPortsOf(card)])
  return new Map([...new Set(ports.map(([nodeId]) => nodeId))].map((nodeId) => [nodeId, ports.filter(([id]) => id === nodeId).map(([, port]) => port)]))
}
