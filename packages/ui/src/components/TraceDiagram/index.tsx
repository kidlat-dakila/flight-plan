import {
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  type Connection as FlowConnection,
  type Edge,
  type EdgeProps,
  type FinalConnectionState,
  type Node,
  type NodeChange as FlowNodeChange,
  type NodeProps,
  type ReactFlowState,
} from "@xyflow/react"
import {
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CrosshairIcon,
  ParenthesesIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import ConfirmDialog from "@/components/ConfirmDialog"
import DiagramBoard, { type BoardView } from "@/components/DiagramBoard"
import { DiagramEdge, EdgeMarkerDefs, useEdgeMarkers, type EdgeKind, type EdgeMarkers, type Emphasis } from "@/components/DiagramEdges"
import DiagramNodePanel from "@/components/DiagramNodePanel"
import IconButton from "@/components/IconButton"
import NodeCodeView, { type CodeView, type LineSpan } from "@/components/NodeCodeView"
import Prose from "@/components/Prose"
import Unwritten from "@/components/Unwritten"
import { WriteUpOffer } from "@/components/WriteUpIcon"
import { artifactPartMark } from "@/lib/artifact-part"
import { straightPath, type Point } from "@/lib/diagram-path"
import { cutOffBy, lineageOf, neighbourhoodOf, type Connection } from "@/lib/diagram-reach"
import { navigatorButtonOf, WRITE_UP_KEY, type NavigatorButton } from "@/lib/navigator-controls"
import type { CodeDefinitions, CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { arrangeTrace, nearestSideOf, placeUnplacedCards, type CardSide, type PositionById } from "@/lib/trace-arrangement"
import { toTraceFlow, type FlowFrame, type FlowHandleType } from "@/lib/trace-flow"
import { CALLEE_HEAD_HEIGHT, innerWidthOf, layoutTrace, nestedCardWidthOf, NODE_HEAD_HEIGHT, NODE_WIDTH, type Box, type LayoutNode, type LayoutRow, type LayoutRowKind, type PlacedRow } from "@/lib/trace-layout"
import { cn } from "@/lib/utils"
import BlockTypeIcon, { BlockListIcon } from "./type-icons"

export type NodeChange = "added" | "modified"

export interface TraceTriggerLabel {
  readonly id: string
  readonly type: string
  readonly typeLabel: string
  readonly name: string
  readonly label: string
  readonly isDraft: boolean
  readonly hint?: string | null
  readonly change: NodeChange | null
  readonly lines: readonly LineSpan[]
}

export interface TraceListedBlock {
  readonly id: string
  readonly name: string
  readonly label: string
  readonly isDraft: boolean
  readonly hint?: string | null
  readonly change: NodeChange | null
  readonly lines: readonly LineSpan[]
}

export interface TraceBlockList {
  readonly kind: string
  readonly label: string
  readonly blocks: readonly TraceListedBlock[]
}

export interface TraceCalleeCard {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly typeLabel: string
  readonly change: NodeChange | null
  readonly changedLabel: string | null
  readonly rowIds: readonly string[]
}

export interface TraceRowGroup {
  readonly label: string | null
  readonly rowIds: readonly string[]
  readonly childIds: readonly string[]
  readonly calleeCards?: readonly TraceCalleeCard[]
}

export interface TraceNode {
  readonly id: string
  readonly type: string
  readonly typeLabel: string
  readonly change: NodeChange | null
  readonly changedLabel: string | null
  readonly label: string
  readonly isDraft: boolean
  readonly classification: { readonly key: string, readonly label: string }
  readonly hint: string | null
  readonly isBeingWritten: boolean
  readonly name: string
  readonly shortPath: string
  readonly description: ProseBlocks | null
  readonly codeLinkId: string | null
  readonly codeViews: readonly CodeView[]
  readonly parameters: readonly string[]
  readonly blockLists: readonly TraceBlockList[]
  readonly triggerLabels: readonly TraceTriggerLabel[]
  readonly rowGroups: readonly TraceRowGroup[]
  readonly position: Point | null
  readonly width?: number
  readonly children: readonly TraceNode[]
}

export interface TraceEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly fromRowId: string | null
  readonly toRowId: string | null
  readonly toSide: CardSide
}

export interface CardPlace extends Point {
  readonly nodeId: string
}

export interface RowLine {
  readonly from: string
  readonly fromRowId: string
  readonly to: string
  readonly toSide: CardSide
}

export interface DrawnLine {
  readonly edgeId: string
  readonly from: string
  readonly to: string
}

export interface LineEnd {
  readonly from: string
  readonly fromRowId: string
  readonly position: Point
  readonly places: readonly CardPlace[]
}

interface DroppedLine extends Pick<LineEnd, "from" | "fromRowId"> {
  readonly end: Point
  readonly cardCount: number
}

export interface TraceAuthoring {
  readonly isPending: boolean
  readonly onAddCard: () => void
  readonly onClearDiagram: () => void
  readonly onRemoveDiagram: () => void
  readonly onAddCardAtLineEnd: (lineEnd: LineEnd) => void
  readonly onDrawLine: (line: RowLine) => void
  readonly onRemoveLine: (line: DrawnLine) => void
  readonly onEditCard: (nodeId: string) => void
  readonly onRemoveCard: (nodeId: string) => void
}

type DiagramDiscard = "clear" | "remove"

interface DiscardConfirmation {
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
}

export interface CardMoving {
  readonly onMoveCards: (places: readonly CardPlace[]) => void
  readonly onResizeCard: (nodeId: string, width: number) => void
}

interface TraceDiagramProps {
  readonly title: string
  readonly nodes: readonly TraceNode[]
  readonly edges: readonly TraceEdge[]
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly isReviewPending: boolean
  readonly authoring?: TraceAuthoring | null
  readonly cardMoving?: CardMoving | null
  readonly navigatorAnchorId?: string | null
  readonly isFullScreenAtStart?: boolean
  readonly onWriteUpNode?: ((nodeId: string) => void) | null
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
}

interface Concealment {
  readonly collapsedNodeIds: readonly string[]
  readonly focusedNodeId: string | null
}

const CARD_NO_WRITE_UP_LABEL = "Not explained yet."
const CARD_BEING_WRITTEN_LABEL = "The agent is explaining this card."
const WRITE_UP_CARD_LABEL = "Explain this card"

const CHANGE_BORDER_CLASSES: Record<NodeChange, string> = {
  added: "border-diff-added",
  modified: "border-line-blue",
}

const CHANGE_TEXT_CLASSES: Record<NodeChange, string> = {
  added: "text-diff-added",
  modified: "text-line-blue",
}

const EMPHASIS_BORDER_CLASSES: Record<Emphasis, string> = {
  selected: "border-primary outline outline-primary",
  hovered: "border-primary/60 outline outline-primary/60",
}

const TRIGGER_EMPHASIS_CLASSES: Record<Emphasis, string> = {
  selected: "bg-accent outline outline-primary",
  hovered: "outline outline-primary/60",
}

const NOTHING_CONCEALED: Concealment = { collapsedNodeIds: [], focusedNodeId: null }
const EDGE_KIND: EdgeKind = "call"
const HALF = 2
const NODE_TYPE = "trace-node"
const NEW_CARD_NODE_TYPE = "trace-new-card"
const NEW_CARD_NODE_ID = "trace-new-card"
const NEW_CARD_HANDLE_ID = "new-card:line-end"
const NEW_CARD_LINE_ID = "trace-new-card-line"
const NEW_CARD_SIZE = 32
const NEW_CARD_LABEL = "Create Card"
const NEW_CARD_CLASSES = "nodrag nopan flex size-full items-center justify-center rounded-full border border-dashed border-primary bg-card text-primary transition-colors duration-[180ms] ease-out hover:bg-accent disabled:opacity-60"
const EDGE_TYPE = "trace-line"
const LINE_ABOVE_NODES_Z_INDEX = 1000
const PAN_THRESHOLD_PX = 4
const HANDLE_POSITIONS: Readonly<Record<FlowHandleType, Position>> = { source: Position.Right, target: Position.Left }
const HANDLE_CLASSES = "right-auto bottom-auto size-0 min-h-0 min-w-0 transform-none border-0 bg-transparent"
const CANVAS_CLASSES = "size-full bg-[radial-gradient(circle,var(--border)_1px,transparent_1px)] bg-size-[16px_16px] select-none data-[measured=false]:invisible"
const PRO_OPTIONS = { hideAttribution: true }
const LINE_CLASSES = "text-muted-foreground"
const NODE_STYLE = { pointerEvents: "all" } as const
const NODE_CLASSES = "absolute inset-0 rounded-md transition-colors duration-[180ms] ease-out"
const HEAD_CLASSES = "flex w-full flex-col rounded-md text-left"
const HEAD_BAR_CLASSES = "flex h-7 shrink-0 items-center gap-2 rounded-t-md border-b border-input bg-foreground/5 px-2.5"
const HEAD_BODY_CLASSES = "flex min-h-0 flex-1 flex-col justify-center gap-1 px-3"
const ROW_ICON_CLASSES = "size-3.5 shrink-0 text-muted-foreground"
const HEAD_PATH_CLASSES = "truncate font-mono text-[0.6875rem] leading-4 text-muted-foreground"
const TRIGGER_CLASSES = "absolute flex items-center gap-2 rounded border border-input bg-card px-2 text-left transition-colors duration-[180ms] ease-out hover:bg-accent"
const NODE_MENU_CLASSES = "absolute top-1 right-1 z-10 hidden gap-0.5 rounded-md border border-input bg-card p-0.5 group-focus-within:flex group-hover:flex data-[pinned=true]:flex"
const NODE_MENU_BUTTON_CLASSES = "flex size-6 items-center justify-center rounded text-foreground transition-colors duration-[180ms] ease-out hover:bg-accent aria-pressed:text-primary-text"
const PARAMETERS_LABEL = "Parameters"
const PARAMETERS_ID_SUFFIX = ":parameters"
const PARAMETER_CHAR_WIDTH_PX = 6.7
const PARAMETER_CHIP_PADDING_PX = 14
const PARAMETER_CHIP_GAP_PX = 4
const PARAMETERS_CLASSES = "absolute flex flex-wrap content-start gap-1"
const PARAMETER_CHIP_CLASSES = "flex h-5 max-w-full items-center rounded-sm border bg-muted px-1.5 font-mono text-[0.6875rem] leading-4 text-muted-foreground"
const ROW_HEADING_CLASSES = "absolute flex items-end px-0.5 text-[0.625rem] leading-3 font-bold tracking-wide text-muted-foreground uppercase"
const CALLEE_CARD_CLASSES = "pointer-events-none absolute rounded-md border bg-card"
const CALLEE_HEAD_CLASSES = "flex items-center gap-1.5 px-2"
const CALLEE_KIND_CLASSES = "ml-auto flex shrink-0 items-center gap-1 text-[0.6875rem] leading-4 text-muted-foreground"
const ARGUMENT_BLOCK_TYPE = "root-argument-value"
const ARGUMENT_KIND = "argument"
const SITE_KINDS: ReadonlySet<string> = new Set(["call", "return", "throw"])
const THROW_KIND = "throw"
const CALLEE_ID_SEPARATOR = ":callee:"
const UNDRAWN_LINE_KINDS: ReadonlySet<LayoutRowKind> = new Set<LayoutRowKind>(["heading", "parameters", "argument-row", "callee"])
const FOCUS_LABEL = "Show only the paths through this node"
const COLLAPSE_LABEL = "Hide the nodes this node leads to"
const EXPAND_LABEL = "Show the nodes this node leads to again"
const EDIT_CARD_LABEL = "Modify this card"
const REMOVE_CARD_LABEL = "Delete this card and the cards it points to"
const REMOVE_LINE_LABEL = "Remove the selected line"
const ADD_CARD_LABEL = "Add card"
const CLEAR_DIAGRAM_LABEL = "Clear diagram"
const REMOVE_DIAGRAM_LABEL = "Remove diagram"
const NO_CARD_HINT = "This diagram has no card yet."
const ADD_CARD_KEY = "c"
const CLEAR_DIAGRAM_KEY = "k"
const REMOVE_DIAGRAM_KEY = "l"
const DISCARD_CONFIRMATIONS: Readonly<Record<DiagramDiscard, DiscardConfirmation>> = {
  clear: {
    title: "Clear this diagram?",
    description: "Every card, every line and the description go. The diagram stays, empty.",
    confirmLabel: CLEAR_DIAGRAM_LABEL,
  },
  remove: {
    title: "Remove this diagram?",
    description: "The diagram goes from this segment with its cards, its lines and its description.",
    confirmLabel: REMOVE_DIAGRAM_LABEL,
  },
}
const DRAW_LINE_LABEL = "Draw a line from this row"
const CARD_SIDES: readonly CardSide[] = ["left", "top", "bottom"]
const SIDE_POSITIONS: Readonly<Record<CardSide, Position>> = { left: Position.Left, top: Position.Top, bottom: Position.Bottom }
const SIDE_LABELS: Readonly<Record<CardSide, string>> = { left: "End a line on the left of this card", top: "End a line on the top of this card", bottom: "End a line on the bottom of this card" }
const ROW_HANDLE_PREFIX = "row:"
const SIDE_HANDLE_PREFIX = "side:"
const CONNECT_HANDLE_RADIUS = 5
const CONNECT_HANDLE_SIZE = 10
const CONNECT_HANDLE_CLASSES = "nodrag right-auto bottom-auto z-10 size-2.5 min-h-0 min-w-0 transform-none rounded-full border border-primary bg-card opacity-60 transition-opacity duration-[180ms] ease-out hover:opacity-100"
const LINE_HIT_AREA_CLASSES = "cursor-pointer fill-none stroke-transparent [stroke-width:14]"
const NO_POSITIONS: PositionById = new Map()
const NO_WIDTHS: WidthById = new Map()
const MAX_CARD_WIDTH = 720
const RESIZE_GRIP_TOP = 40
const RESIZE_GRIP_BOTTOM_INSET = 8
const RESIZE_GRIP_STYLE = { top: RESIZE_GRIP_TOP, height: NODE_HEAD_HEIGHT - RESIZE_GRIP_TOP - RESIZE_GRIP_BOTTOM_INSET }
const RESIZE_GRIP_LABEL = "Drag to change the width of this card"
const RESIZE_GRIP_CLASSES = "nodrag nopan absolute -right-1 z-10 hidden w-2 cursor-ew-resize touch-none justify-center group-focus-within:flex group-hover:flex data-[dragging=true]:flex"
const RESIZE_GRIP_BAR_CLASSES = "h-full w-1 rounded-full bg-primary/60 transition-colors duration-[180ms] ease-out hover:bg-primary"
const NODE_SELECTOR = ".react-flow__node"
const CONNECTION_RADIUS = 28
const CONNECTION_LINE_STYLE = { stroke: "var(--primary)", strokeWidth: 2 }
const COLLAPSE_ALL_LABEL = "Collapse all"
const EXPAND_ALL_LABEL = "Expand all"
const COLLAPSE_KEY = "q"

type WidthById = ReadonlyMap<string, number>

const listNodes = (nodes: readonly TraceNode[]): TraceNode[] => nodes.flatMap((node) => [node, ...listNodes(node.children)])

interface BlockRow {
  readonly kind: string
  readonly kindLabel: string
  readonly block: TraceListedBlock
}

interface RowHeading {
  readonly id: string
  readonly label: string
}

const HEADING_ID_SEPARATOR = ":heading:"

const headingIdOf = (node: TraceNode, groupIndex: number): string => [node.id, String(groupIndex)].join(HEADING_ID_SEPARATOR)

const listBlockRows = (node: TraceNode): BlockRow[] =>
  node.blockLists.flatMap(({ kind, label, blocks }) => blocks.map((block) => ({ kind, kindLabel: label, block })))

const calleeCardsOf = (group: TraceRowGroup): readonly TraceCalleeCard[] => group.calleeCards ?? []

const isEmptyGroup = (group: TraceRowGroup): boolean =>
  group.rowIds.length === 0 && group.childIds.length === 0 && calleeCardsOf(group).length === 0

const listRowHeadings = (node: TraceNode): RowHeading[] =>
  node.rowGroups.flatMap((group, groupIndex) => (group.label === null || isEmptyGroup(group) ? [] : [{ id: headingIdOf(node, groupIndex), label: group.label }]))

const calleeRowIdOf = (node: TraceNode, callee: TraceCalleeCard): string => [node.id, callee.id].join(CALLEE_ID_SEPARATOR)

interface PlacedCallee {
  readonly rowId: string
  readonly callee: TraceCalleeCard
}

const listCallees = (node: TraceNode): PlacedCallee[] =>
  node.rowGroups.flatMap(calleeCardsOf).map((callee) => ({ rowId: calleeRowIdOf(node, callee), callee }))

const isFunctionCard = (node: TraceNode): boolean => node.rowGroups.some((group) => group.calleeCards !== undefined)

interface ChipPacking {
  readonly lineCount: number
  readonly lineWidth: number
}

const chipWidthOf = (parameter: string, rowWidth: number): number => Math.min(rowWidth, parameter.length * PARAMETER_CHAR_WIDTH_PX + PARAMETER_CHIP_PADDING_PX)

const parameterLineCountOf = (parameters: readonly string[], rowWidth: number): number =>
  parameters.reduce<ChipPacking>(({ lineCount, lineWidth }, parameter) => {
    const width = chipWidthOf(parameter, rowWidth)
    const widthOnLine = lineWidth === 0 ? width : lineWidth + PARAMETER_CHIP_GAP_PX + width
    return widthOnLine <= rowWidth ? { lineCount, lineWidth: widthOnLine } : { lineCount: lineCount + 1, lineWidth: width }
  }, { lineCount: 1, lineWidth: 0 }).lineCount

const parametersIdOf = (node: TraceNode): string => `${node.id}${PARAMETERS_ID_SUFFIX}`

const parametersRowsOf = (node: TraceNode, cardWidth: number): LayoutRow[] =>
  node.parameters.length === 0 ? [] : [{ id: parametersIdOf(node), kind: "parameters", lineCount: parameterLineCountOf(node.parameters, innerWidthOf(cardWidth)) }]

const rowKindOf = ({ isDraft }: Pick<TraceTriggerLabel, "isDraft">): LayoutRowKind => (isDraft ? "row" : "two-line-row")

interface DrawnRowSource {
  readonly isDraft: boolean
  readonly kind: string | null
}

const siteRowKindOf = ({ isDraft }: DrawnRowSource): LayoutRowKind => (isDraft ? "row" : "site-row")

const functionCardRowKindOf = (row: DrawnRowSource): LayoutRowKind => {
  if (row.kind === ARGUMENT_KIND) return "argument-row"
  return row.kind !== null && SITE_KINDS.has(row.kind) ? siteRowKindOf(row) : rowKindOf(row)
}

const toLayoutRows = (node: TraceNode, cardWidth: number): LayoutRow[] => {
  const rowById = new Map<string, DrawnRowSource>([
    ...node.blockLists.flatMap(({ kind, blocks }) => blocks.map((block) => [block.id, { isDraft: block.isDraft, kind }] as const)),
    ...node.triggerLabels.map((trigger) => [trigger.id, { isDraft: trigger.isDraft, kind: null }] as const),
  ])
  const kindOfRow = isFunctionCard(node) ? functionCardRowKindOf : rowKindOf
  const rowsOf = (rowIds: readonly string[], kindOf: (row: DrawnRowSource) => LayoutRowKind): LayoutRow[] =>
    rowIds.flatMap((rowId): LayoutRow[] => {
      const row = rowById.get(rowId)
      return row === undefined ? [] : [{ id: rowId, kind: kindOf(row) }]
    })
  const groupRowsOf = (group: TraceRowGroup, groupIndex: number): LayoutRow[] => [
    ...(group.label === null ? [] : [{ id: headingIdOf(node, groupIndex), kind: "heading" as const }]),
    ...rowsOf(group.rowIds, kindOfRow),
    ...calleeCardsOf(group).map((callee): LayoutRow => ({ id: calleeRowIdOf(node, callee), kind: "callee", rows: rowsOf(callee.rowIds, siteRowKindOf) })),
    ...group.childIds.map((childId): LayoutRow => ({ id: childId, kind: "card" })),
  ]
  return [...parametersRowsOf(node, cardWidth), ...node.rowGroups.flatMap((group, groupIndex) => (isEmptyGroup(group) ? [] : groupRowsOf(group, groupIndex)))]
}

const toNestedLayoutNode = (node: TraceNode, cardWidth: number): LayoutNode => ({
  id: node.id,
  rows: toLayoutRows(node, cardWidth),
  children: node.children.map((child) => toNestedLayoutNode(child, nestedCardWidthOf(cardWidth))),
})

const toLayoutNode = (node: TraceNode, requestedWidth: number | undefined): LayoutNode => {
  const cardWidth = Math.max(NODE_WIDTH, requestedWidth ?? NODE_WIDTH)
  const layoutNode = toNestedLayoutNode(node, cardWidth)
  return requestedWidth === undefined ? layoutNode : { ...layoutNode, requestedWidth }
}

const storedWidthsOf = (nodes: readonly TraceNode[]): WidthById =>
  new Map(nodes.flatMap((node) => (node.width === undefined ? [] : [[node.id, node.width] as const])))

const withWidth = (widthById: WidthById, nodeId: string, width: number): WidthById => new Map([...widthById, [nodeId, width]])

const withoutWidth = (widthById: WidthById, nodeId: string): WidthById => new Map([...widthById].filter(([id]) => id !== nodeId))

const clampedCardWidthOf = (width: number): number => Math.min(MAX_CARD_WIDTH, Math.max(NODE_WIDTH, width))

interface WidthDrag {
  readonly startX: number
  readonly startWidth: number
}

const widthAfterDrag = ({ startX, startWidth }: WidthDrag, pointerX: number, zoom: number): number =>
  clampedCardWidthOf(startWidth + (pointerX - startX) / zoom)

const topIdsOf = (nodes: readonly TraceNode[]): ReadonlyMap<string, string> =>
  new Map(nodes.flatMap((node) => listNodes([node]).map((inside) => [inside.id, node.id] as const)))

const connectionsBetween = (edges: readonly TraceEdge[], topIdById: ReadonlyMap<string, string>): Connection[] =>
  edges.flatMap((edge) => {
    const from = topIdById.get(edge.from)
    const to = topIdById.get(edge.to)
    return from === undefined || to === undefined || from === to ? [] : [{ id: edge.id, from, to }]
  })

const hiddenTopIdsOf = (nodes: readonly TraceNode[], connections: readonly Connection[], { collapsedNodeIds, focusedNodeId }: Concealment): ReadonlySet<string> => {
  const rootIds = nodes.filter((node) => connections.every((connection) => connection.to !== node.id)).map((node) => node.id)
  const cutOff = [...cutOffBy(connections, collapsedNodeIds, rootIds)].filter((nodeId) => !collapsedNodeIds.includes(nodeId))
  const lineage = focusedNodeId === null ? null : lineageOf(connections, focusedNodeId)
  const besideFocus = lineage === null ? [] : nodes.filter((node) => !lineage.has(node.id)).map((node) => node.id)
  return new Set([...cutOff, ...besideFocus])
}

const toggled = (ids: readonly string[], id: string): string[] => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id])

const emphasisOf = (id: string, selectedIds: ReadonlySet<string>, hoveredIds: ReadonlySet<string>): Emphasis | null => {
  if (selectedIds.has(id)) return "selected"
  return hoveredIds.has(id) ? "hovered" : null
}

const borderClassesOf = (change: NodeChange | null, emphasis: Emphasis | null): string => {
  const width = change === null ? "border" : "border-2"
  if (emphasis !== null) return cn(width, EMPHASIS_BORDER_CLASSES[emphasis])
  return cn(width, change === null ? "border-input" : CHANGE_BORDER_CLASSES[change])
}

const boxStyleOf = ({ x, y, width, height }: Box) => ({ left: x, top: y, width, height })

interface CardActions {
  readonly isPending: boolean
  readonly onEdit: () => void
  readonly onRemove: () => void
}

interface CardResizing {
  readonly onResize: (width: number) => void
  readonly onResizeEnd: (width: number) => void
  readonly onResizeCancel: () => void
}

const PRIMARY_BUTTON = 0

const zoomOf = (state: ReactFlowState): number => state.transform[2]

interface ResizeGripProps {
  readonly width: number
  readonly resizing: CardResizing
}

const ResizeGrip = ({ width, resizing: { onResize, onResizeEnd, onResizeCancel } }: ResizeGripProps) => {
  const zoom = useStore(zoomOf)
  const [drag, setDrag] = useState<WidthDrag | null>(null)
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== PRIMARY_BUTTON) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ startX: event.clientX, startWidth: width })
  }
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag !== null) onResize(widthAfterDrag(drag, event.clientX, zoom))
  }
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag === null) return
    setDrag(null)
    onResizeEnd(Math.round(widthAfterDrag(drag, event.clientX, zoom)))
  }
  const cancelDrag = () => {
    if (drag === null) return
    setDrag(null)
    onResizeCancel()
  }
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={RESIZE_GRIP_LABEL}
      title={RESIZE_GRIP_LABEL}
      data-dragging={drag !== null}
      className={RESIZE_GRIP_CLASSES}
      style={RESIZE_GRIP_STYLE}
      onPointerDown={startDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={cancelDrag}
    >
      <span aria-hidden="true" className={RESIZE_GRIP_BAR_CLASSES} />
    </div>
  )
}

interface NodeBoxProps {
  readonly node: TraceNode
  readonly cardActions: CardActions | null
  readonly depth: number
  readonly emphasis: Emphasis | null
  readonly isSelected: boolean
  readonly isCollapsed: boolean
  readonly isFocusedOn: boolean
  readonly onSelect: () => void
  readonly onHoverChange: (isHovered: boolean) => void
  readonly onFocusToggle: () => void
  readonly onCollapseToggle: () => void
  readonly children?: ReactNode
}

const NodeHint = ({ hint }: { readonly hint: string | null }) =>
  hint === null ? null : <span className="line-clamp-2 text-[0.75rem] leading-4 text-muted-foreground">{hint}</span>

const writeUpButtonsOf = (node: TraceNode | null, onWriteUpNode: ((nodeId: string) => void) | null): NavigatorButton[] =>
  node === null || onWriteUpNode === null || !node.isDraft || node.isBeingWritten
    ? []
    : [navigatorButtonOf({ key: WRITE_UP_KEY, actionId: "explain-trace-card-action", label: WRITE_UP_CARD_LABEL, onRun: () => { onWriteUpNode(node.id) } })]

const authoringButtonsOf = (authoring: TraceAuthoring | null, cardCount: number, onAskDiscard: (discard: DiagramDiscard) => void): NavigatorButton[] =>
  authoring === null
    ? []
    : [
        navigatorButtonOf({ key: ADD_CARD_KEY, actionId: "add-card-action", label: ADD_CARD_LABEL, onRun: authoring.onAddCard }),
        navigatorButtonOf({
          key: CLEAR_DIAGRAM_KEY,
          actionId: "clear-diagram-action",
          label: CLEAR_DIAGRAM_LABEL,
          isDisabled: authoring.isPending || cardCount === 0,
          disabledHint: cardCount === 0 ? NO_CARD_HINT : null,
          onRun: () => { onAskDiscard("clear") },
        }),
        navigatorButtonOf({ key: REMOVE_DIAGRAM_KEY, actionId: "remove-diagram-action", label: REMOVE_DIAGRAM_LABEL, isDisabled: authoring.isPending, onRun: () => { onAskDiscard("remove") } }),
      ]

const discardOf = (authoring: TraceAuthoring, discard: DiagramDiscard): (() => void) =>
  discard === "clear" ? authoring.onClearDiagram : authoring.onRemoveDiagram

const NodeBox = ({ node, cardActions, depth, emphasis, isSelected, isCollapsed, isFocusedOn, onSelect, onHoverChange, onFocusToggle, onCollapseToggle, children }: NodeBoxProps) => {
  const CollapseIcon = isCollapsed ? ChevronsUpDownIcon : ChevronsDownUpIcon
  const collapseLabel = isCollapsed ? EXPAND_LABEL : COLLAPSE_LABEL
  return (
    <div
      data-node-id={node.id}
      {...artifactPartMark("trace-node", node.id)}
      data-type={node.type}
      data-change={node.change ?? undefined}
      data-emphasis={emphasis ?? undefined}
      className={cn("group", NODE_CLASSES, depth % HALF === 1 ? "bg-muted" : "bg-card", borderClassesOf(node.change, emphasis))}
    >
      <button
        type="button"
        aria-pressed={isSelected}
        data-user-action-id="trace-diagram-card-action"
        data-change={node.change ?? undefined}
        className={HEAD_CLASSES}
        style={{ height: NODE_HEAD_HEIGHT }}
        onMouseEnter={() => { onHoverChange(true) }}
        onMouseLeave={() => { onHoverChange(false) }}
        onFocus={() => { onHoverChange(true) }}
        onBlur={() => { onHoverChange(false) }}
        onClick={onSelect}
      >
        <span data-node-header={node.id} className={HEAD_BAR_CLASSES}>
          <BlockTypeIcon type={node.type} className={ROW_ICON_CLASSES} />
          <span className="min-w-0 truncate font-mono text-[0.75rem] leading-4 font-bold">{node.name}</span>
        </span>
        <span className={HEAD_BODY_CLASSES}>
          <span className="flex min-w-0 items-center gap-1 text-[0.6875rem] leading-4 text-muted-foreground">
            <span className="shrink-0">{node.typeLabel}</span>
            {node.classification.label === node.typeLabel
              ? null
              : <span className="min-w-0 truncate before:mr-1 before:content-['•']">{node.classification.label}</span>}
            {node.change === null || node.changedLabel === null
              ? null
              : <span className={cn("ml-auto font-bold", CHANGE_TEXT_CLASSES[node.change])}>{node.changedLabel}</span>}
          </span>
          <Unwritten isPending={node.isDraft} lineCount={2} className="w-full gap-1 py-0 text-[0.8125rem] [&>[aria-hidden]]:my-[0.2em]">
            {node.isDraft
              ? <NodeHint hint={node.hint} />
              : <span className="line-clamp-2 text-[0.8125rem] leading-4 font-bold">{node.label}</span>}
          </Unwritten>
          <span data-node-path={node.id} title={node.shortPath} className={HEAD_PATH_CLASSES}>{node.shortPath}</span>
        </span>
      </button>
      {depth > 0 && cardActions === null
        ? null
        : (
            <div role="toolbar" aria-label={node.label} data-pinned={isFocusedOn || isCollapsed} className={cn("nodrag", NODE_MENU_CLASSES)}>
              {cardActions === null
                ? null
                : (
                    <>
                      <button type="button" aria-label={`${EDIT_CARD_LABEL}: ${node.label}`} title={EDIT_CARD_LABEL} className={NODE_MENU_BUTTON_CLASSES} onClick={cardActions.onEdit}>
                        <PencilIcon aria-hidden="true" className="size-3.5" />
                      </button>
                      <button type="button" disabled={cardActions.isPending} aria-label={`${REMOVE_CARD_LABEL}: ${node.label}`} title={REMOVE_CARD_LABEL} className={NODE_MENU_BUTTON_CLASSES} onClick={cardActions.onRemove}>
                        <Trash2Icon aria-hidden="true" className="size-3.5" />
                      </button>
                    </>
                  )}
              {depth > 0
                ? null
                : (
                    <>
                      <button type="button" aria-pressed={isFocusedOn} aria-label={`${FOCUS_LABEL}: ${node.label}`} title={FOCUS_LABEL} className={NODE_MENU_BUTTON_CLASSES} onClick={onFocusToggle}>
                        <CrosshairIcon aria-hidden="true" className="size-3.5" />
                      </button>
                      <button type="button" aria-pressed={isCollapsed} aria-label={`${collapseLabel}: ${node.label}`} title={collapseLabel} className={NODE_MENU_BUTTON_CLASSES} onClick={onCollapseToggle}>
                        <CollapseIcon aria-hidden="true" className="size-3.5" />
                      </button>
                    </>
                  )}
            </div>
          )}
      {children}
    </div>
  )
}

interface TriggerRowProps {
  readonly nodeId: string
  readonly trigger: TraceTriggerLabel
  readonly placed: PlacedRow
  readonly emphasis: Emphasis | null
  readonly onSelect: () => void
  readonly onHoverChange: (isHovered: boolean) => void
}

const TriggerRow = ({ nodeId, trigger, placed, emphasis, onSelect, onHoverChange }: TriggerRowProps) => (
  <button
    type="button"
    data-trigger-id={trigger.id}
    {...artifactPartMark("trace-node", nodeId)}
    data-change={trigger.change ?? undefined}
    aria-label={`${trigger.typeLabel}: ${trigger.label}`}
    title={trigger.isDraft ? trigger.hint ?? undefined : undefined}
    className={cn(TRIGGER_CLASSES, trigger.change !== null && CHANGE_BORDER_CLASSES[trigger.change], emphasis !== null && TRIGGER_EMPHASIS_CLASSES[emphasis])}
    style={boxStyleOf(placed)}
    onMouseEnter={() => { onHoverChange(true) }}
    onMouseLeave={() => { onHoverChange(false) }}
    onFocus={() => { onHoverChange(true) }}
    onBlur={() => { onHoverChange(false) }}
    onClick={onSelect}
  >
    <BlockTypeIcon type={trigger.type} className={ROW_ICON_CLASSES} />
    <span className="flex min-w-0 flex-col">
      <Unwritten isPending={trigger.isDraft} className="h-4 w-24 py-0 text-[0.75rem]">
        <span className={cn("truncate text-[0.75rem] leading-4", trigger.isDraft ? "font-mono text-muted-foreground" : "font-bold")}>{trigger.label}</span>
      </Unwritten>
      {trigger.isDraft ? null : <span className="truncate font-mono text-[0.6875rem] leading-4 text-muted-foreground">{trigger.name}</span>}
    </span>
  </button>
)

interface BlockRowButtonProps {
  readonly nodeId: string
  readonly row: BlockRow
  readonly placed: PlacedRow
  readonly emphasis: Emphasis | null
  readonly onSelect: () => void
  readonly onHoverChange: (isHovered: boolean) => void
}

const rowIconClassesOf = (kind: string): string => cn(ROW_ICON_CLASSES, kind === THROW_KIND && "text-destructive")

const BlockRowButton = ({ nodeId, row: { kind, kindLabel, block }, placed, emphasis, onSelect, onHoverChange }: BlockRowButtonProps) => (
  <button
    type="button"
    data-block-id={block.id}
    {...artifactPartMark("trace-node", nodeId)}
    data-block-kind={kind}
    data-change={block.change ?? undefined}
    aria-label={`${kindLabel}: ${block.label}`}
    title={block.isDraft ? block.hint ?? undefined : undefined}
    className={cn(TRIGGER_CLASSES, block.change !== null && CHANGE_BORDER_CLASSES[block.change], emphasis !== null && TRIGGER_EMPHASIS_CLASSES[emphasis])}
    style={boxStyleOf(placed)}
    onMouseEnter={() => { onHoverChange(true) }}
    onMouseLeave={() => { onHoverChange(false) }}
    onFocus={() => { onHoverChange(true) }}
    onBlur={() => { onHoverChange(false) }}
    onClick={onSelect}
  >
    {placed.kind === "argument-row"
      ? (
          <>
            <ParenthesesIcon aria-hidden="true" className={ROW_ICON_CLASSES} />
            <span className="min-w-0 truncate font-mono text-[0.6875rem] leading-4">{block.label}</span>
          </>
        )
      : (
          <>
            <BlockListIcon kind={kind} className={rowIconClassesOf(kind)} />
            <span className="flex min-w-0 flex-col">
              <Unwritten isPending={block.isDraft} className="h-4 w-24 py-0 text-[0.75rem]">
                <span className={cn("text-[0.75rem] leading-4", placed.kind === "site-row" ? "line-clamp-2" : "truncate", block.isDraft ? "font-mono text-muted-foreground" : "font-bold")}>{block.label}</span>
              </Unwritten>
              {block.isDraft ? null : <span className="truncate font-mono text-[0.6875rem] leading-4 text-muted-foreground">{block.name}</span>}
            </span>
          </>
        )}
  </button>
)

const CalleeIcon = ({ type }: { readonly type: string }) =>
  type === ARGUMENT_BLOCK_TYPE
    ? <ParenthesesIcon aria-hidden="true" className={ROW_ICON_CLASSES} />
    : <BlockTypeIcon type={type} className={ROW_ICON_CLASSES} />

interface CalleeFrameProps {
  readonly nodeId: string
  readonly callee: TraceCalleeCard
  readonly placed: PlacedRow
}

const CalleeFrame = ({ nodeId, callee, placed }: CalleeFrameProps) => (
  <div
    data-callee-card={callee.id}
    {...artifactPartMark("trace-node", nodeId)}
    data-change={callee.change ?? undefined}
    className={cn(CALLEE_CARD_CLASSES, callee.change === null ? "border-input" : CHANGE_BORDER_CLASSES[callee.change])}
    style={boxStyleOf(placed)}
  >
    <div className={CALLEE_HEAD_CLASSES} style={{ height: CALLEE_HEAD_HEIGHT }}>
      <CalleeIcon type={callee.type} />
      <span className="min-w-0 truncate font-mono text-[0.6875rem] leading-4 font-bold">{callee.name}</span>
      <span className={CALLEE_KIND_CLASSES}>
        <span>{callee.typeLabel}</span>
        {callee.change === null || callee.changedLabel === null
          ? null
          : <span className={cn("font-bold before:mr-1 before:font-normal before:text-muted-foreground before:content-['•']", CHANGE_TEXT_CLASSES[callee.change])}>{callee.changedLabel}</span>}
      </span>
    </div>
  </div>
)

interface FlowNodeData extends Record<string, unknown> {
  readonly node: TraceNode
  readonly frame: FlowFrame
  readonly cardActions: CardActions | null
  readonly resizing: CardResizing | null
  readonly emphasis: Emphasis | null
  readonly isSelected: boolean
  readonly isCollapsed: boolean
  readonly isFocusedOn: boolean
  readonly onSelect: (rowId: string | null) => void
  readonly onHoverChange: (isHovered: boolean) => void
  readonly onFocusToggle: () => void
  readonly onCollapseToggle: () => void
}

type FlowNode = Node<FlowNodeData, typeof NODE_TYPE>

interface FlowEdgeData extends Record<string, unknown> {
  readonly edgeId: string
  readonly isSelectable: boolean
  readonly bends: readonly Point[]
  readonly emphasis: Emphasis | null
  readonly hasArrow: boolean
  readonly markers: EdgeMarkers
}

type FlowEdge = Edge<FlowEdgeData, typeof EDGE_TYPE>

const rowHandleIdOf = (rowId: string): string => `${ROW_HANDLE_PREFIX}${rowId}`

const sideHandleIdOf = (side: CardSide): string => `${SIDE_HANDLE_PREFIX}${side}`

interface ConnectHandle extends Point {
  readonly id: string
  readonly type: FlowHandleType
  readonly position: Position
  readonly title: string
}

const sideCentreOf = (side: CardSide, { width, height }: FlowFrame): Point => {
  if (side === "left") return { x: 0, y: NODE_HEAD_HEIGHT / HALF }
  return { x: width / HALF, y: side === "top" ? 0 : height }
}

const aroundCentre = ({ x, y }: Point): Point => ({ x: x - CONNECT_HANDLE_RADIUS, y: y - CONNECT_HANDLE_RADIUS })

const connectHandlesOf = (frame: FlowFrame): ConnectHandle[] => [
  ...frame.rows
    .filter((placed) => !UNDRAWN_LINE_KINDS.has(placed.kind))
    .map((placed) => ({
      id: rowHandleIdOf(placed.id),
      type: "source" as const,
      position: Position.Right,
      title: DRAW_LINE_LABEL,
      ...aroundCentre({ x: frame.width, y: placed.y + placed.height / HALF }),
    })),
  ...CARD_SIDES.map((side) => ({
    id: sideHandleIdOf(side),
    type: "target" as const,
    position: SIDE_POSITIONS[side],
    title: SIDE_LABELS[side],
    ...aroundCentre(sideCentreOf(side, frame)),
  })),
]

const FlowNodeView = ({ data: { node, frame, cardActions, resizing, emphasis, isSelected, isCollapsed, isFocusedOn, onSelect, onHoverChange, onFocusToggle, onCollapseToggle } }: NodeProps<FlowNode>) => {
  const headingById = new Map(listRowHeadings(node).map((heading) => [heading.id, heading] as const))
  const blockRowById = new Map(listBlockRows(node).map((row) => [row.block.id, row] as const))
  const triggerById = new Map(node.triggerLabels.map((trigger) => [trigger.id, trigger] as const))
  const calleeByRowId = new Map(listCallees(node).map(({ rowId, callee }) => [rowId, callee] as const))
  return (
    <>
      <NodeBox
        node={node}
        cardActions={cardActions}
        depth={frame.depth}
        emphasis={emphasis}
        isSelected={isSelected}
        isCollapsed={isCollapsed}
        isFocusedOn={isFocusedOn}
        onSelect={() => { onSelect(null) }}
        onHoverChange={onHoverChange}
        onFocusToggle={onFocusToggle}
        onCollapseToggle={onCollapseToggle}
      >
        {resizing === null ? null : <ResizeGrip width={frame.width} resizing={resizing} />}
      </NodeBox>
      {frame.rows.flatMap((placed) => {
        const heading = headingById.get(placed.id)
        const blockRow = blockRowById.get(placed.id)
        const trigger = triggerById.get(placed.id)
        const callee = calleeByRowId.get(placed.id)
        if (callee !== undefined) return [<CalleeFrame key={placed.id} nodeId={node.id} callee={callee} placed={placed} />]
        if (heading !== undefined) return [<span key={placed.id} data-row-heading={node.id} {...artifactPartMark("trace-node", node.id)} className={ROW_HEADING_CLASSES} style={boxStyleOf(placed)}>{heading.label}</span>]
        if (placed.kind === "parameters") {
          return [
            <ul key={placed.id} aria-label={PARAMETERS_LABEL} {...artifactPartMark("trace-node", node.id)} className={PARAMETERS_CLASSES} style={boxStyleOf(placed)}>
              {node.parameters.map((parameter) => (
                <li key={parameter} title={parameter} className={PARAMETER_CHIP_CLASSES}>
                  <span className="truncate">{parameter}</span>
                </li>
              ))}
            </ul>,
          ]
        }
        const selectRow = () => {
          onSelect(placed.id)
        }
        if (blockRow !== undefined) return [<BlockRowButton key={placed.id} nodeId={node.id} row={blockRow} placed={placed} emphasis={emphasis} onSelect={selectRow} onHoverChange={onHoverChange} />]
        return trigger === undefined
          ? []
          : [<TriggerRow key={placed.id} nodeId={node.id} trigger={trigger} placed={placed} emphasis={emphasis} onSelect={selectRow} onHoverChange={onHoverChange} />]
      })}
      {frame.handles.map((handle) => (
        <Handle
          key={handle.id}
          id={handle.id}
          type={handle.type}
          position={HANDLE_POSITIONS[handle.type]}
          isConnectable={false}
          className={HANDLE_CLASSES}
          style={{ left: handle.x, top: handle.y }}
        />
      ))}
      {cardActions === null
        ? null
        : (
            connectHandlesOf(frame).map((handle) => (
              <Handle
                key={handle.id}
                id={handle.id}
                type={handle.type}
                position={handle.position}
                title={handle.title}
                className={CONNECT_HANDLE_CLASSES}
                style={{ left: handle.x, top: handle.y }}
              />
            ))
          )}
    </>
  )
}

const toWholePixels = ({ x, y }: Point): Point => ({ x: Math.round(x), y: Math.round(y) })

const FlowEdgeView = ({ sourceX, sourceY, targetX, targetY, data }: EdgeProps<FlowEdge>) =>
  data === undefined
    ? null
    : (
        <>
          <DiagramEdge
            path={straightPath([{ x: sourceX, y: sourceY }, ...data.bends, { x: targetX, y: targetY }].map(toWholePixels))}
            kind={EDGE_KIND}
            isAssumed={false}
            emphasis={data.emphasis}
            hasArrow={data.hasArrow}
            markers={data.markers}
          />
          {data.isSelectable
            ? <path d={straightPath([{ x: sourceX, y: sourceY }, ...data.bends, { x: targetX, y: targetY }].map(toWholePixels))} className={LINE_HIT_AREA_CLASSES} />
            : null}
        </>
      )

interface NewCardNodeData extends Record<string, unknown> {
  readonly isPending: boolean
  readonly onCreate: () => void
}

type NewCardNode = Node<NewCardNodeData, typeof NEW_CARD_NODE_TYPE>

type CanvasNode = FlowNode | NewCardNode

const NewCardNodeView = ({ data: { isPending, onCreate } }: NodeProps<NewCardNode>) => (
  <>
    <button type="button" disabled={isPending} aria-label={NEW_CARD_LABEL} title={NEW_CARD_LABEL} className={NEW_CARD_CLASSES} onClick={onCreate}>
      <PlusIcon aria-hidden="true" className="size-4" />
    </button>
    <Handle id={NEW_CARD_HANDLE_ID} type="target" position={Position.Left} isConnectable={false} className={HANDLE_CLASSES} style={{ left: 0, top: NEW_CARD_SIZE / HALF }} />
  </>
)

const NODE_TYPES = { [NODE_TYPE]: FlowNodeView, [NEW_CARD_NODE_TYPE]: NewCardNodeView }
const EDGE_TYPES = { [EDGE_TYPE]: FlowEdgeView }

const paneWidthOf = (state: ReactFlowState): number => state.width

interface CanvasMoving {
  readonly onCardDrag: (nodeId: string, position: Point) => void
  readonly onCardDrop: (nodeId: string, position: Point) => void
}

interface CanvasAuthoring {
  readonly onConnect: (connection: FlowConnection) => void
  readonly onLineDropOnBoard: (line: Pick<LineEnd, "from" | "fromRowId">, screenPoint: Point, toBoardPoint: (screenPoint: Point) => Point) => void
  readonly onLineSelect: (edgeId: string) => void
  readonly onBoardClick: () => void
}

const isBetweenTwoCards = ({ source, target }: { readonly source: string | null, readonly target: string | null }): boolean => source !== target

const dropPointOf = (event: MouseEvent | TouchEvent): Point | null => {
  const pointer = "changedTouches" in event ? event.changedTouches.item(0) : event
  return pointer === null ? null : { x: pointer.clientX, y: pointer.clientY }
}

type LineDrop
  = | { readonly kind: "card", readonly connection: FlowConnection }
    | { readonly kind: "board", readonly line: Pick<LineEnd, "from" | "fromRowId">, readonly point: Point }

const lineDropOf = (event: MouseEvent | TouchEvent, { isValid, fromNode, fromHandle }: FinalConnectionState): LineDrop | null => {
  const point = dropPointOf(event)
  if (isValid === true || point === null || fromNode === null) return null
  const sourceHandle = fromHandle.id ?? null
  if (sourceHandle?.startsWith(ROW_HANDLE_PREFIX) !== true) return null
  const card = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>(NODE_SELECTOR) ?? null
  const target = card?.dataset.id ?? null
  if (card === null || target === null || target === NEW_CARD_NODE_ID) return { kind: "board", line: { from: fromNode.id, fromRowId: sourceHandle.slice(ROW_HANDLE_PREFIX.length) }, point }
  const targetHandle = sideHandleIdOf(nearestSideOf(point, card.getBoundingClientRect()))
  return { kind: "card", connection: { source: fromNode.id, sourceHandle, target, targetHandle } }
}

interface FlowCanvasProps {
  readonly label: string
  readonly authoring: CanvasAuthoring | null
  readonly moving: CanvasMoving | null
  readonly width: number
  readonly view: BoardView
  readonly nodes: CanvasNode[]
  readonly edges: FlowEdge[]
  readonly markers: EdgeMarkers
}

const FlowCanvas = ({ label, authoring, moving, width, view: { zoom, offset, onPan }, nodes, edges, markers }: FlowCanvasProps) => {
  const paneWidth = useStore(paneWidthOf)
  const { screenToFlowPosition } = useReactFlow()
  const centringX = Math.max(0, (paneWidth - width * zoom) / HALF)
  const handleConnectEnd = (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
    const drop = lineDropOf(event, connectionState)
    if (drop?.kind === "card" && isBetweenTwoCards(drop.connection)) authoring?.onConnect(drop.connection)
    if (drop?.kind === "board") authoring?.onLineDropOnBoard(drop.line, drop.point, screenToFlowPosition)
  }
  const handleNodesChange = (changes: readonly FlowNodeChange<CanvasNode>[]) => {
    changes.forEach((change) => {
      if (change.type === "position" && change.position !== undefined) moving?.onCardDrag(change.id, change.position)
    })
  }
  return (
    <div
      role="group"
      aria-label={label}
      data-measured={paneWidth > 0}
      className={CANVAS_CLASSES}
      style={{ backgroundPosition: `${String(offset.x)}px ${String(offset.y)}px` }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        viewport={{ x: centringX + offset.x, y: offset.y, zoom }}
        onViewportChange={({ x, y }) => { onPan({ x: x - centringX, y }) }}
        zIndexMode="manual"
        paneClickDistance={PAN_THRESHOLD_PX}
        nodesDraggable={moving !== null}
        nodesConnectable={authoring !== null}
        isValidConnection={isBetweenTwoCards}
        onNodesChange={moving === null ? undefined : handleNodesChange}
        onNodeDragStop={moving === null ? undefined : (_event, node) => { moving.onCardDrop(node.id, node.position) }}
        onConnect={authoring === null ? undefined : authoring.onConnect}
        onConnectEnd={authoring === null ? undefined : handleConnectEnd}
        connectionRadius={CONNECTION_RADIUS}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        onEdgeClick={authoring === null ? undefined : (_event, edge) => { if (edge.data !== undefined) authoring.onLineSelect(edge.data.edgeId) }}
        onPaneClick={authoring === null ? undefined : authoring.onBoardClick}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        deleteKeyCode={null}
        disableKeyboardA11y
        proOptions={PRO_OPTIONS}
      >
        <svg aria-hidden="true" className={cn("absolute size-0", LINE_CLASSES)}>
          <EdgeMarkerDefs markers={markers} />
        </svg>
      </ReactFlow>
    </div>
  )
}

const lineOfConnection = ({ source, sourceHandle, target, targetHandle }: FlowConnection): RowLine | null => {
  const toSide = CARD_SIDES.find((side) => sideHandleIdOf(side) === targetHandle)
  if (sourceHandle?.startsWith(ROW_HANDLE_PREFIX) !== true || toSide === undefined) return null
  return { from: source, fromRowId: sourceHandle.slice(ROW_HANDLE_PREFIX.length), to: target, toSide }
}

const TraceDiagram = ({ title, nodes, edges, codeLinks, codeDefinitions, isReviewPending, authoring = null, cardMoving = null, navigatorAnchorId = null, isFullScreenAtStart = false, onWriteUpNode = null, onOpenCodeLink, onWaypointReviewedChange }: TraceDiagramProps) => {
  const [draggedPositionById, setDraggedPositionById] = useState<PositionById>(NO_POSITIONS)
  const [draggedWidthById, setDraggedWidthById] = useState<WidthById>(NO_WIDTHS)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [droppedLine, setDroppedLine] = useState<DroppedLine | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [concealment, setConcealment] = useState<Concealment>(NOTHING_CONCEALED)
  const [isFullScreen, setIsFullScreen] = useState(isFullScreenAtStart)
  const [askedDiscard, setAskedDiscard] = useState<DiagramDiscard | null>(null)
  const markers = useEdgeMarkers()
  const { collapsedNodeIds, focusedNodeId } = concealment
  const topIdById = topIdsOf(nodes)
  const connections = connectionsBetween(edges, topIdById)
  const hiddenTopIds = hiddenTopIdsOf(nodes, connections, concealment)
  const shownTopNodes = nodes.filter((node) => !hiddenTopIds.has(node.id))
  const shownNodes = listNodes(shownTopNodes)
  const shownIds = new Set(shownNodes.map((node) => node.id))
  const shownEdges = edges.filter((edge) => shownIds.has(edge.from) && shownIds.has(edge.to))
  const widthById: WidthById = new Map([...storedWidthsOf(nodes), ...draggedWidthById])
  const layoutNodes = shownTopNodes.map((node) => toLayoutNode(node, widthById.get(node.id)))
  const computedLayout = layoutTrace(layoutNodes, shownEdges)
  const storedPositionById: PositionById = new Map(nodes.flatMap((node) => (node.position === null ? [] : [[node.id, node.position] as const])))
  const positionById: PositionById = new Map([...placeUnplacedCards(computedLayout, storedPositionById), ...draggedPositionById])
  const layout = arrangeTrace(computedLayout, positionById, new Map(shownEdges.map((edge) => [edge.id, edge.toSide] as const)))
  const selectedLine = shownEdges.find((edge) => edge.id === selectedLineId) ?? null
  const placesOfTops: readonly CardPlace[] = layout.nodes.filter((placed) => placed.depth === 0).map((placed) => ({ nodeId: placed.id, x: placed.x, y: placed.y }))
  const canvasMoving: CanvasMoving | null = cardMoving === null
    ? null
    : {
        onCardDrag: (nodeId, position) => { setDraggedPositionById((dragged) => new Map([...dragged, [nodeId, position]])) },
        onCardDrop: (nodeId, position) => {
          cardMoving.onMoveCards(placesOfTops.map((place) => (place.nodeId === nodeId ? { nodeId, x: position.x, y: position.y } : place)))
        },
      }
  const setDraggedWidth = (nodeId: string, width: number) => {
    setDraggedWidthById((dragged) => withWidth(dragged, nodeId, width))
  }
  const resizingOf = (frame: FlowFrame): CardResizing | null =>
    cardMoving === null || frame.depth > 0
      ? null
      : {
          onResize: (width) => { setDraggedWidth(frame.id, width) },
          onResizeEnd: (width) => {
            setDraggedWidth(frame.id, width)
            cardMoving.onResizeCard(frame.id, width)
          },
          onResizeCancel: () => { setDraggedWidthById((dragged) => withoutWidth(dragged, frame.id)) },
        }
  const canvasAuthoring: CanvasAuthoring | null = authoring === null
    ? null
    : {
        onLineDropOnBoard: (line, screenPoint, toBoardPoint) => { setDroppedLine({ ...line, end: toBoardPoint(screenPoint), cardCount: nodes.length }) },
        onConnect: (connection) => {
          const line = lineOfConnection(connection)
          if (line !== null) authoring.onDrawLine(line)
        },
        onLineSelect: setSelectedLineId,
        onBoardClick: () => {
          setSelectedLineId(null)
          setDroppedLine(null)
        },
      }
  const lineToNewCard = authoring !== null && droppedLine !== null && droppedLine.cardCount === nodes.length && shownIds.has(droppedLine.from) ? droppedLine : null
  const flow = toTraceFlow(layoutNodes, layout)
  const nodeById = new Map(shownNodes.map((node) => [node.id, node] as const))
  const blockRowById = new Map(shownNodes.flatMap((node) => listBlockRows(node).map((row) => [row.block.id, row] as const)))
  const triggerById = new Map(shownNodes.flatMap((node) => node.triggerLabels.map((trigger) => [trigger.id, trigger] as const)))
  const selected = neighbourhoodOf(shownEdges, selectedNodeId)
  const hovered = neighbourhoodOf(shownEdges, hoveredNodeId)
  const selectedNode = selectedNodeId === null ? null : (nodeById.get(selectedNodeId) ?? null)
  const selectedTarget = selectedNode?.codeLinkId == null || !Object.hasOwn(codeLinks, selectedNode.codeLinkId) ? null : codeLinks[selectedNode.codeLinkId]
  const selectedRowLines = selectedRowId === null ? null : (blockRowById.get(selectedRowId)?.block.lines ?? triggerById.get(selectedRowId)?.lines ?? null)
  const selectNode = (nodeId: string, rowId: string | null) => {
    setSelectedNodeId(nodeId)
    setSelectedRowId(rowId)
    setIsFullScreen(true)
  }
  const conceal = (nextConcealment: Concealment) => {
    setConcealment(nextConcealment)
    setHoveredNodeId(null)
    const selectedTopId = selectedNodeId === null ? undefined : topIdById.get(selectedNodeId)
    if (selectedTopId !== undefined && hiddenTopIdsOf(nodes, connections, nextConcealment).has(selectedTopId)) setSelectedNodeId(null)
  }
  const leadingIds = nodes.filter((node) => connections.some((connection) => connection.from === node.id)).map((node) => node.id)
  const flowNodes = flow.frames.flatMap((frame): FlowNode[] => {
    const node = nodeById.get(frame.id)
    return node === undefined
      ? []
      : [{
          id: frame.id,
          type: NODE_TYPE,
          ...(frame.parentId === null ? {} : { parentId: frame.parentId }),
          position: frame.position,
          width: frame.width,
          height: frame.height,
          zIndex: frame.depth,
          draggable: cardMoving !== null && frame.depth === 0,
          style: NODE_STYLE,
          handles: [
            ...frame.handles.map(({ id, type, x, y }) => ({ id, type, position: HANDLE_POSITIONS[type], x, y, width: 0, height: 0 })),
            ...(authoring === null ? [] : connectHandlesOf(frame).map(({ id, type, position, x, y }) => ({ id, type, position, x, y, width: CONNECT_HANDLE_SIZE, height: CONNECT_HANDLE_SIZE }))),
          ],
          data: {
            node,
            frame,
            cardActions: authoring === null
              ? null
              : {
                  isPending: authoring.isPending,
                  onEdit: () => { authoring.onEditCard(frame.id) },
                  onRemove: () => { authoring.onRemoveCard(frame.id) },
                },
            resizing: resizingOf(frame),
            emphasis: emphasisOf(frame.id, selected.nodeIds, hovered.nodeIds),
            isSelected: frame.id === selectedNodeId,
            isCollapsed: collapsedNodeIds.includes(frame.id),
            isFocusedOn: frame.id === focusedNodeId,
            onSelect: (rowId) => { selectNode(frame.id, rowId) },
            onHoverChange: (isHovered) => { setHoveredNodeId(isHovered ? frame.id : null) },
            onFocusToggle: () => { conceal({ ...concealment, focusedNodeId: frame.id === focusedNodeId ? null : frame.id }) },
            onCollapseToggle: () => { conceal({ ...concealment, collapsedNodeIds: toggled(collapsedNodeIds, frame.id) }) },
          },
        }]
  })
  const flowEdges = flow.lines.map((line): FlowEdge => ({
    id: line.id,
    type: EDGE_TYPE,
    source: line.source,
    target: line.target,
    sourceHandle: line.sourceHandleId,
    targetHandle: line.targetHandleId,
    zIndex: line.isAboveNodes ? LINE_ABOVE_NODES_Z_INDEX : 0,
    className: cn(LINE_CLASSES, authoring !== null && line.isAboveNodes && "pointer-events-none"),
    domAttributes: { "aria-hidden": true },
    data: {
      edgeId: line.edgeId,
      isSelectable: authoring !== null && !line.isAboveNodes,
      bends: line.bends,
      emphasis: line.edgeId === selectedLineId ? "selected" : emphasisOf(line.edgeId, selected.edgeIds, hovered.edgeIds),
      hasArrow: line.hasArrow,
      markers,
    },
  }))
  const newCardNodes: NewCardNode[] = authoring === null || lineToNewCard === null
    ? []
    : [{
        id: NEW_CARD_NODE_ID,
        type: NEW_CARD_NODE_TYPE,
        position: { x: lineToNewCard.end.x, y: lineToNewCard.end.y - NEW_CARD_SIZE / HALF },
        width: NEW_CARD_SIZE,
        height: NEW_CARD_SIZE,
        zIndex: LINE_ABOVE_NODES_Z_INDEX,
        draggable: false,
        style: NODE_STYLE,
        handles: [{ id: NEW_CARD_HANDLE_ID, type: "target", position: Position.Left, x: 0, y: NEW_CARD_SIZE / HALF, width: 0, height: 0 }],
        data: {
          isPending: authoring.isPending,
          onCreate: () => {
            const { from, fromRowId, end } = lineToNewCard
            authoring.onAddCardAtLineEnd({ from, fromRowId, position: { x: end.x, y: end.y - NODE_HEAD_HEIGHT / HALF }, places: placesOfTops })
          },
        },
      }]
  const newCardEdges: FlowEdge[] = lineToNewCard === null
    ? []
    : [{
        id: NEW_CARD_LINE_ID,
        type: EDGE_TYPE,
        source: lineToNewCard.from,
        target: NEW_CARD_NODE_ID,
        sourceHandle: rowHandleIdOf(lineToNewCard.fromRowId),
        targetHandle: NEW_CARD_HANDLE_ID,
        zIndex: LINE_ABOVE_NODES_Z_INDEX,
        className: cn(LINE_CLASSES, "pointer-events-none"),
        domAttributes: { "aria-hidden": true },
        data: { edgeId: NEW_CARD_LINE_ID, isSelectable: false, bends: [], emphasis: null, hasArrow: true, markers },
      }]
  return (
    <>
      <DiagramBoard
        label={title}
        width={layout.width}
        height={layout.height}
        isFullScreen={isFullScreen}
        onFullScreenChange={(isOpening) => {
          setIsFullScreen(isOpening)
          if (!isOpening) setSelectedNodeId(null)
        }}
        onPanelClose={() => { setSelectedNodeId(null) }}
        navigation={navigatorAnchorId === null
          ? null
          : {
              anchorId: navigatorAnchorId,
              groups: [
                [
                  navigatorButtonOf({
                    key: COLLAPSE_KEY,
                    actionId: "collapse-trace-cards-action",
                    label: collapsedNodeIds.length === 0 ? COLLAPSE_ALL_LABEL : EXPAND_ALL_LABEL,
                    onRun: () => {
                      conceal(collapsedNodeIds.length === 0 ? { collapsedNodeIds: leadingIds, focusedNodeId: null } : NOTHING_CONCEALED)
                    },
                  }),
                  ...writeUpButtonsOf(selectedNode, onWriteUpNode),
                ],
                authoringButtonsOf(authoring, nodes.length, setAskedDiscard),
              ],
            }}
        actions={authoring === null || selectedLine === null
          ? null
          : (
              <IconButton
                icon="delete"
                label={REMOVE_LINE_LABEL}
                isDisabled={authoring.isPending}
                onClick={() => {
                  authoring.onRemoveLine({ edgeId: selectedLine.id, from: selectedLine.from, to: selectedLine.to })
                  setSelectedLineId(null)
                }}
              />
            )}
        panel={selectedNode === null
          ? null
          : (
              <DiagramNodePanel
                title={selectedNode.label}
                kindLabel={selectedNode.typeLabel}
                partMark={artifactPartMark("trace-node", selectedNode.id)}
                target={selectedNode.codeViews.length === 0 ? selectedTarget : null}
                codeViews={selectedNode.codeViews.map((view) => (
                  <NodeCodeView
                    key={view.id}
                    view={view}
                    focusedLines={selectedRowLines}
                    isReviewPending={isReviewPending}
                    codeLinks={codeLinks}
                    codeDefinitions={codeDefinitions}
                    onOpenCodeLink={onOpenCodeLink}
                    onWaypointReviewedChange={onWaypointReviewedChange}
                  />
                ))}
                onClose={() => { setSelectedNodeId(null) }}
              >
                {selectedNode.isDraft
                  ? (
                      <WriteUpOffer
                        hint={selectedNode.hint}
                        label={selectedNode.isBeingWritten ? CARD_BEING_WRITTEN_LABEL : CARD_NO_WRITE_UP_LABEL}
                        isBeingWritten={selectedNode.isBeingWritten}
                        buttonLabel={WRITE_UP_CARD_LABEL}
                        onWriteUp={onWriteUpNode === null ? null : () => { onWriteUpNode(selectedNode.id) }}
                      />
                    )
                  : null}
                {selectedNode.description === null
                  ? null
                  : <Prose blocks={selectedNode.description} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
              </DiagramNodePanel>
            )}
        renderCanvas={(view) => (
          <ReactFlowProvider>
            <FlowCanvas label={title} authoring={canvasAuthoring} moving={canvasMoving} width={layout.width} view={view} nodes={[...flowNodes, ...newCardNodes]} edges={[...flowEdges, ...newCardEdges]} markers={markers} />
          </ReactFlowProvider>
        )}
      />
      {authoring === null || askedDiscard === null
        ? null
        : (
            <ConfirmDialog
              {...DISCARD_CONFIRMATIONS[askedDiscard]}
              onConfirm={() => {
                discardOf(authoring, askedDiscard)()
                setAskedDiscard(null)
              }}
              onCancel={() => { setAskedDiscard(null) }}
            />
          )}
    </>
  )
}

export default TraceDiagram
