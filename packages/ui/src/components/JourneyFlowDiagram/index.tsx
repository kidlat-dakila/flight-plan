import {
  AppWindowIcon,
  BracesIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CrosshairIcon,
  DatabaseIcon,
  EyeIcon,
  EyeOffIcon,
  MousePointerClickIcon,
  PlayIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import DiagramBoard from "@/components/DiagramBoard"
import DiagramEdges, { DiagramEdge, type EdgeKind, type Emphasis } from "@/components/DiagramEdges"
import DiagramNodePanel from "@/components/DiagramNodePanel"
import IconButton from "@/components/IconButton"
import Prose from "@/components/Prose"
import { pointBeyondEnd, smoothPath, type Point } from "@/lib/diagram-path"
import { cutOffBy, hiddenBehind, lineageOf, neighbourhoodOf, pathFrom, sourcesLeadingTo, type Neighbourhood } from "@/lib/diagram-reach"
import type { CodeLinkTarget, CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export type NodeCategory = "guard" | "logic" | "data" | "type" | "ui" | "event" | "config"

export type NodeChange = "added" | "modified"

export interface JourneyNode {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly kind: "entry-point" | "code"
  readonly change: NodeChange | null
  readonly category: NodeCategory | null
  readonly kindLabel: string
  readonly changedLabel: string | null
  readonly label: string
  readonly isDraft: boolean
  readonly sublabel: string | null
  readonly description: ProseBlocks | null
  readonly codeLinkId: string | null
  readonly tracedCode: CodeLinkTarget | null
  readonly tracedHeading: string | null
  readonly isInsideCard: boolean
}

export type ChangeType = "diff" | "related" | "none"

interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface UiFrame extends Box {
  readonly key: string
  readonly nodeId: string | null
  readonly depth: number
  readonly label: string
  readonly isDraft: boolean
  readonly change: NodeChange | null
  readonly changedLabel: string | null
  readonly data: readonly { readonly name: string, readonly changeType: ChangeType }[]
  readonly hiddenDataLabel: string | null
  readonly hasLineOut: boolean
  readonly hasLineIn: boolean
}

export interface UiTrigger extends Box {
  readonly key: string
  readonly entryPointId: string
  readonly eventNodeId: string
  readonly label: string
  readonly sublabel: string
}

export interface UiCard extends Box {
  readonly id: string
  readonly kindLabel: string
  readonly label: string
  readonly sublabel: string
  readonly frames: readonly UiFrame[]
  readonly triggers: readonly UiTrigger[]
}

export interface JourneyEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly points: readonly Point[]
  readonly isInsideCard: boolean
}

interface JourneyFlowDiagramProps {
  readonly title: string
  readonly width: number
  readonly height: number
  readonly nodes: readonly JourneyNode[]
  readonly uiCards: readonly UiCard[]
  readonly edges: readonly JourneyEdge[]
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const CATEGORY_ICONS: Record<NodeCategory, LucideIcon> = {
  guard: ShieldIcon,
  logic: WorkflowIcon,
  data: DatabaseIcon,
  type: BracesIcon,
  ui: AppWindowIcon,
  event: MousePointerClickIcon,
  config: SlidersHorizontalIcon,
}

const NODE_CLASSES: Record<JourneyNode["kind"], string> = {
  "entry-point": "flex-row items-center gap-2 bg-sign px-3 text-sign-foreground",
  "code": "flex-col justify-center gap-1 bg-card px-3",
}

const PLAIN_BORDER_CLASSES: Record<JourneyNode["kind"], string> = {
  "entry-point": "border-sign dark:border-input",
  "code": "border-input",
}

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

const borderClassesOf = ({ kind, change }: Pick<JourneyNode, "kind" | "change">, emphasis: Emphasis | null): string => {
  const width = change === null ? "border" : "border-2"
  if (emphasis !== null) return cn(width, EMPHASIS_BORDER_CLASSES[emphasis])
  return cn(width, change === null ? PLAIN_BORDER_CLASSES[kind] : CHANGE_BORDER_CLASSES[change])
}

interface Concealment {
  readonly hiddenEntryPointIds: readonly string[]
  readonly collapsedNodeIds: readonly string[]
  readonly focusedNodeId: string | null
}

const NOTHING_CONCEALED: Concealment = { hiddenEntryPointIds: [], collapsedNodeIds: [], focusedNodeId: null }

const idsBesideFocus = (nodes: readonly JourneyNode[], edges: readonly JourneyEdge[], focusedNodeId: string | null): string[] => {
  if (focusedNodeId === null) return []
  const lineage = lineageOf(edges, focusedNodeId)
  return nodes.filter((node) => node.kind === "code" && !lineage.has(node.id)).map((node) => node.id)
}

const entryPointIdsOf = (nodes: readonly JourneyNode[]): string[] =>
  nodes.filter((node) => node.kind === "entry-point").map((node) => node.id)

const rootIdsOf = (nodes: readonly JourneyNode[], edges: readonly JourneyEdge[]): string[] =>
  nodes.filter((node) => edges.every((edge) => edge.to !== node.id)).map((node) => node.id)

const hiddenNodeIdsOf = (
  nodes: readonly JourneyNode[],
  edges: readonly JourneyEdge[],
  { hiddenEntryPointIds, collapsedNodeIds, focusedNodeId }: Concealment,
): ReadonlySet<string> => {
  const shownEntryPointIds = entryPointIdsOf(nodes).filter((entryPointId) => !hiddenEntryPointIds.includes(entryPointId))
  const shownRootIds = rootIdsOf(nodes, edges).filter((rootId) => !hiddenEntryPointIds.includes(rootId))
  return new Set([
    ...hiddenBehind(edges, hiddenEntryPointIds, shownEntryPointIds),
    ...cutOffBy(edges, collapsedNodeIds, shownRootIds),
    ...idsBesideFocus(nodes, edges, focusedNodeId),
  ])
}

const isEdgeShown = (
  edge: JourneyEdge,
  hiddenIds: ReadonlySet<string>,
  { hiddenEntryPointIds, collapsedNodeIds }: Pick<Concealment, "hiddenEntryPointIds" | "collapsedNodeIds">,
): boolean =>
  !hiddenEntryPointIds.includes(edge.from) && !hiddenIds.has(edge.from) && (!hiddenIds.has(edge.to) || collapsedNodeIds.includes(edge.to))

const entryPointIdsAwayFrom = (nodes: readonly JourneyNode[], edges: readonly JourneyEdge[], nodeId: string): string[] => {
  const entryPointIds = entryPointIdsOf(nodes)
  const leadingIds = sourcesLeadingTo(edges, entryPointIds, nodeId)
  return entryPointIds.filter((entryPointId) => !leadingIds.includes(entryPointId))
}

const toggled = (ids: readonly string[], id: string): string[] => (ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id])

const emphasisedAround = (nodes: readonly JourneyNode[], edges: readonly JourneyEdge[], nodeId: string | null): Neighbourhood => {
  const isEntryPoint = nodes.some((node) => node.id === nodeId && node.kind === "entry-point")
  return nodeId !== null && isEntryPoint ? pathFrom(edges, nodeId) : neighbourhoodOf(edges, nodeId)
}

const emphasisOf = (id: string, selectedIds: ReadonlySet<string>, hoveredIds: ReadonlySet<string>): Emphasis | null => {
  if (selectedIds.has(id)) return "selected"
  return hoveredIds.has(id) ? "hovered" : null
}

const HALF = 2

const NODE_BASE_CLASSES = "flex size-full rounded-md text-left transition-colors duration-[180ms] ease-out"
const PATH_TOGGLE_CLASSES = "absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded text-sign-foreground transition-colors duration-[180ms] ease-out hover:bg-sign-foreground/15 aria-pressed:text-sign-muted"
const NODE_MENU_CLASSES = "absolute top-full left-1/2 z-10 hidden w-max -translate-x-1/2 pt-1 group-focus-within:block group-hover:block data-[pinned=true]:block"
const NODE_MENU_BUTTON_CLASSES = "flex items-center gap-1 rounded px-2 py-1 text-[0.6875rem] leading-4 font-bold text-foreground transition-colors duration-[180ms] ease-out hover:bg-accent aria-pressed:text-primary-text"
const EXPAND_BUTTON_CLASSES = "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-foreground transition-colors duration-[180ms] ease-out hover:border-primary"
const EXPAND_BUTTON_REACH_PX = 14
const FOCUS_LABEL = "Focus"
const FOCUS_HINT = "Show only the entry points that lead to this node"
const COLLAPSE_LABEL = "Collapse"
const COLLAPSE_HINT = "Hide this node and the nodes it leads to"
const COLLAPSE_ALL_LABEL = "Collapse all"
const EXPAND_ALL_LABEL = "Expand all"
const EXPAND_LABEL = "Expand"
const EXPAND_HINT = "Show this node and the nodes it leads to again"
const HIDDEN_PATH_CLASSES = "border-dashed bg-sign/40 text-sign-muted"
const HIDE_PATH_LABEL = "Hide the nodes this entry point leads to"
const SHOW_PATH_LABEL = "Show the nodes this entry point leads to"

const HOVER_HINT_CLASSES = "pointer-events-none absolute top-full left-1/2 z-30 mt-1 hidden w-max max-w-56 -translate-x-1/2 rounded border border-input bg-card px-2 py-1 text-left text-[0.6875rem] leading-4 font-normal text-foreground shadow-md group-hover/hint:block group-focus-visible/hint:block"

const HoverHint = ({ text }: { readonly text: string }) => (
  <span aria-hidden="true" data-hint className={HOVER_HINT_CLASSES}>{text}</span>
)

interface NodeCardProps {
  readonly node: JourneyNode
  readonly emphasis: Emphasis | null
  readonly isSelected: boolean
  readonly isPathHidden: boolean
  readonly isFocusedOn: boolean
  readonly onSelect: () => void
  readonly onHoverChange: (isHovered: boolean) => void
  readonly onPathToggle: () => void
  readonly onFocusToggle: () => void
  readonly onCollapse: () => void
}

const NodeCard = ({
  node,
  emphasis,
  isSelected,
  isPathHidden,
  isFocusedOn,
  onSelect,
  onHoverChange,
  onPathToggle,
  onFocusToggle,
  onCollapse,
}: NodeCardProps) => {
  const CategoryIcon = node.category === null ? PlayIcon : CATEGORY_ICONS[node.category]
  const PathToggleIcon = isPathHidden ? EyeOffIcon : EyeIcon
  const pathToggleLabel = isPathHidden ? SHOW_PATH_LABEL : HIDE_PATH_LABEL
  const hoverHandlers = {
    onMouseEnter: () => { onHoverChange(true) },
    onMouseLeave: () => { onHoverChange(false) },
    onFocus: () => { onHoverChange(true) },
    onBlur: () => { onHoverChange(false) },
  }
  return (
    <div
      className="group absolute focus-within:z-20 hover:z-20"
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
    >
      <button
        type="button"
        {...hoverHandlers}
        aria-pressed={isSelected}
        data-kind={node.kind}
        data-change={node.change ?? undefined}
        data-emphasis={emphasis ?? undefined}
        data-path-hidden={isPathHidden}
        className={cn(
          NODE_BASE_CLASSES,
          NODE_CLASSES[node.kind],
          borderClassesOf(node, emphasis),
          node.kind === "entry-point" && "pr-11",
          isPathHidden && HIDDEN_PATH_CLASSES,
        )}
        onClick={onSelect}
      >
        {node.kind === "entry-point"
          ? (
              <>
                <CategoryIcon aria-hidden="true" className="size-3.5 shrink-0 fill-current" />
                <span className="sr-only">{`${node.kindLabel}: `}</span>
                <span className="line-clamp-2 text-[0.8125rem] leading-4 font-bold">{node.label}</span>
              </>
            )
          : (
              <>
                <span className="flex items-center gap-1.5 text-[0.6875rem] leading-4 text-muted-foreground">
                  <CategoryIcon aria-hidden="true" className="size-3.5 shrink-0" />
                  <span>{node.kindLabel}</span>
                  {node.change === null || node.changedLabel === null
                    ? null
                    : <span className={cn("ml-auto font-bold", CHANGE_TEXT_CLASSES[node.change])}>{node.changedLabel}</span>}
                </span>
                <span
                  className={cn(
                    "line-clamp-2 text-[0.8125rem] leading-4",
                    node.isDraft ? "font-mono text-muted-foreground" : "font-bold",
                  )}
                >
                  {node.label}
                </span>
                {node.sublabel === null
                  ? null
                  : <span className="truncate font-mono text-[0.6875rem] leading-4 text-muted-foreground">{node.sublabel}</span>}
              </>
            )}
      </button>
      {node.kind === "entry-point"
        ? (
            <button
              type="button"
              {...hoverHandlers}
              aria-pressed={isPathHidden}
              aria-label={`${pathToggleLabel}: ${node.label}`}
              className={cn("group/hint", PATH_TOGGLE_CLASSES)}
              onClick={onPathToggle}
            >
              <PathToggleIcon aria-hidden="true" className="size-4" />
              <HoverHint text={pathToggleLabel} />
            </button>
          )
        : (
            <div data-pinned={isFocusedOn} className={NODE_MENU_CLASSES}>
              <div role="toolbar" aria-label={node.label} className="flex gap-0.5 rounded-md border border-input bg-card p-0.5 shadow-md">
                <button
                  type="button"
                  {...hoverHandlers}
                  aria-pressed={isFocusedOn}
                  title={FOCUS_HINT}
                  className={NODE_MENU_BUTTON_CLASSES}
                  onClick={onFocusToggle}
                >
                  <CrosshairIcon aria-hidden="true" className="size-3.5" />
                  {FOCUS_LABEL}
                </button>
                <button
                  type="button"
                  {...hoverHandlers}
                  title={COLLAPSE_HINT}
                  className={NODE_MENU_BUTTON_CLASSES}
                  onClick={onCollapse}
                >
                  <ChevronsDownUpIcon aria-hidden="true" className="size-3.5" />
                  {COLLAPSE_LABEL}
                </button>
              </div>
            </div>
          )}
    </div>
  )
}

const DATA_LABEL = "Data"
const EDGE_KIND: EdgeKind = "call"
const FRAME_HEADER_CENTER_PX = 16
const FRAME_CLASSES = "absolute flex flex-col rounded-md text-left transition-[color,background-color,border-color,opacity] duration-[180ms] ease-out"
const HIDDEN_FRAME_CLASSES = "opacity-40"
const LEAD_CLASSES = "pointer-events-none absolute border-t border-dotted border-muted-foreground"
const PORT_CLASSES = "pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-muted-foreground bg-card"
const TRIGGER_TOGGLE_CLASSES = "absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors duration-[180ms] ease-out hover:bg-accent hover:text-foreground"

const DATA_CLASSES: Record<ChangeType, string> = {
  diff: "bg-diff-added/15 text-foreground ring-1 ring-diff-added/55 ring-inset",
  related: "border border-dashed border-muted-foreground text-foreground",
  none: "text-muted-foreground",
}

const TRIGGER_EMPHASIS_CLASSES: Record<Emphasis, string> = {
  selected: "bg-accent outline outline-primary",
  hovered: "outline outline-primary/60",
}

interface HoverHandlers {
  readonly onMouseEnter: () => void
  readonly onMouseLeave: () => void
  readonly onFocus: () => void
  readonly onBlur: () => void
}

const hoverHandlersOf = (onHoverChange: (isHovered: boolean) => void): HoverHandlers => ({
  onMouseEnter: () => { onHoverChange(true) },
  onMouseLeave: () => { onHoverChange(false) },
  onFocus: () => { onHoverChange(true) },
  onBlur: () => { onHoverChange(false) },
})

const boxStyleOf = ({ x, y, width, height }: Box) => ({ left: x, top: y, width, height })

interface CardLineProps {
  readonly fromX: number
  readonly edgeX: number
  readonly y: number
}

const CardLine = ({ fromX, edgeX, y }: CardLineProps) => (
  <>
    <span aria-hidden="true" className={LEAD_CLASSES} style={{ left: Math.min(fromX, edgeX), top: y, width: Math.abs(edgeX - fromX) }} />
    <span aria-hidden="true" className={PORT_CLASSES} style={{ left: edgeX, top: y }} />
  </>
)

const UiCardShell = ({ card }: { readonly card: UiCard }) => (
  <div className="absolute overflow-hidden rounded-md border border-sign bg-card dark:border-input" style={boxStyleOf(card)}>
    <div className="flex h-8 items-center gap-2 bg-sign px-3 text-[0.8125rem] leading-4 text-sign-foreground">
      <span className="rounded-sm bg-primary px-1.5 text-[0.6875rem] font-extrabold tracking-wider text-primary-foreground">{card.kindLabel}</span>
      <span className="truncate font-mono text-xs font-bold">{card.label}</span>
      <span className="ml-auto truncate font-mono text-[0.6875rem] text-sign-muted">{card.sublabel}</span>
    </div>
  </div>
)

const FrameContent = ({ frame }: { readonly frame: UiFrame }) => (
  <>
    <span className="flex h-8 shrink-0 items-center gap-2 px-2.5">
      <span className={cn("truncate text-[0.8125rem] leading-4", frame.isDraft ? "font-mono text-muted-foreground" : "font-bold")}>{frame.label}</span>
      {frame.change === null || frame.changedLabel === null
        ? null
        : <span className={cn("ml-auto shrink-0 text-[0.6875rem] leading-4 font-bold", CHANGE_TEXT_CLASSES[frame.change])}>{frame.changedLabel}</span>}
    </span>
    {frame.data.length === 0
      ? null
      : (
          <span className="mx-2.5 mt-2 flex h-[22px] items-center gap-1.5 overflow-hidden">
            <span className="text-[0.6875rem] leading-4 tracking-wider text-muted-foreground uppercase">{DATA_LABEL}</span>
            {frame.data.map((entry) => (
              <span key={entry.name} className={cn("rounded-sm px-1 font-mono text-[0.6875rem] leading-[1.125rem]", DATA_CLASSES[entry.changeType])}>{entry.name}</span>
            ))}
            {frame.hiddenDataLabel === null
              ? null
              : <span className="shrink-0 text-[0.6875rem] leading-4 text-muted-foreground">{frame.hiddenDataLabel}</span>}
          </span>
        )}
  </>
)

interface FrameBoxProps {
  readonly frame: UiFrame
  readonly emphasis: Emphasis | null
  readonly isSelected: boolean
  readonly isHidden: boolean
  readonly onSelect: () => void
  readonly onHoverChange: (isHovered: boolean) => void
}

const FrameBox = ({ frame, emphasis, isSelected, isHidden, onSelect, onHoverChange }: FrameBoxProps) => {
  const className = cn(
    FRAME_CLASSES,
    frame.depth % HALF === 1 ? "bg-muted" : "bg-card",
    borderClassesOf({ kind: "code", change: frame.change }, emphasis),
    isHidden && HIDDEN_FRAME_CLASSES,
  )
  return frame.nodeId === null
    ? <div className={className} style={boxStyleOf(frame)}><FrameContent frame={frame} /></div>
    : (
        <button
          type="button"
          {...hoverHandlersOf(onHoverChange)}
          aria-pressed={isSelected}
          data-change={frame.change ?? undefined}
          data-emphasis={emphasis ?? undefined}
          className={className}
          style={boxStyleOf(frame)}
          onClick={onSelect}
        >
          <FrameContent frame={frame} />
        </button>
      )
}

interface TriggerRowProps {
  readonly trigger: UiTrigger
  readonly emphasis: Emphasis | null
  readonly isSelected: boolean
  readonly isPathHidden: boolean
  readonly onSelect: () => void
  readonly onHoverChange: (isHovered: boolean) => void
  readonly onPathToggle: () => void
}

const TriggerRow = ({ trigger, emphasis, isSelected, isPathHidden, onSelect, onHoverChange, onPathToggle }: TriggerRowProps) => {
  const PathToggleIcon = isPathHidden ? EyeOffIcon : EyeIcon
  const pathToggleLabel = isPathHidden ? SHOW_PATH_LABEL : HIDE_PATH_LABEL
  return (
    <div className="absolute" style={boxStyleOf(trigger)}>
      <button
        type="button"
        {...hoverHandlersOf(onHoverChange)}
        aria-pressed={isSelected}
        data-path-hidden={isPathHidden}
        className={cn(
          "flex size-full items-center gap-2 rounded py-1 pr-9 pl-2 text-left transition-colors duration-[180ms] ease-out hover:bg-accent",
          emphasis !== null && TRIGGER_EMPHASIS_CLASSES[emphasis],
          isPathHidden && "text-muted-foreground",
        )}
        onClick={onSelect}
      >
        <MousePointerClickIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[0.8125rem] leading-4 font-bold">{trigger.label}</span>
          <span className="truncate font-mono text-[0.6875rem] leading-4 text-muted-foreground">{trigger.sublabel}</span>
        </span>
      </button>
      <button
        type="button"
        {...hoverHandlersOf(onHoverChange)}
        aria-pressed={isPathHidden}
        aria-label={`${pathToggleLabel}: ${trigger.label}`}
        className={cn("group/hint", TRIGGER_TOGGLE_CLASSES)}
        onClick={onPathToggle}
      >
        <PathToggleIcon aria-hidden="true" className="size-4" />
        <HoverHint text={pathToggleLabel} />
      </button>
    </div>
  )
}

const isFrameHidden = (frame: UiFrame, hiddenIds: ReadonlySet<string>): boolean => frame.nodeId !== null && hiddenIds.has(frame.nodeId)

const isCardShown = (card: UiCard, hiddenIds: ReadonlySet<string>): boolean =>
  card.triggers.length > 0 || card.frames.some((frame) => !isFrameHidden(frame, hiddenIds))

const JourneyFlowDiagram = ({ title, width, height, nodes, uiCards, edges, codeLinks, onOpenCodeLink }: JourneyFlowDiagramProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [concealment, setConcealment] = useState<Concealment>(NOTHING_CONCEALED)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const { hiddenEntryPointIds, collapsedNodeIds, focusedNodeId } = concealment
  const hiddenIds = hiddenNodeIdsOf(nodes, edges, concealment)
  const shownNodes = nodes.filter((node) => !hiddenIds.has(node.id))
  const shownEdges = edges.filter((edge) => isEdgeShown(edge, hiddenIds, concealment))
  const drawnEdges = shownEdges.filter((edge) => !edge.isInsideCard)
  const shownCards = uiCards.filter((card) => isCardShown(card, hiddenIds))
  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setIsFullScreen(true)
  }
  const collapsedNodes = nodes.filter((node) => collapsedNodeIds.includes(node.id))
  const expandPoints = collapsedNodes.flatMap((node) => {
    const stubs = shownEdges.filter((edge) => edge.to === node.id)
    const isRoot = edges.every((edge) => edge.to !== node.id)
    const points = isRoot ? [{ x: node.x + node.width / HALF, y: node.y + node.height / HALF }] : stubs.map((edge) => pointBeyondEnd(edge.points, EXPAND_BUTTON_REACH_PX))
    return points.map((point, position) => ({ key: `${node.id}:${String(position)}`, node, point }))
  })
  const conceal = (nextConcealment: Concealment) => {
    setConcealment(nextConcealment)
    setHoveredNodeId(null)
    if (selectedNodeId !== null && hiddenNodeIdsOf(nodes, edges, nextConcealment).has(selectedNodeId)) setSelectedNodeId(null)
  }
  const selected = emphasisedAround(shownNodes, shownEdges, selectedNodeId)
  const hovered = emphasisedAround(shownNodes, shownEdges, hoveredNodeId)
  const selectedNode = shownNodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedTarget = selectedNode?.codeLinkId == null || !Object.hasOwn(codeLinks, selectedNode.codeLinkId)
    ? null
    : codeLinks[selectedNode.codeLinkId]
  const toggleFocus = (nodeId: string) => {
    conceal(nodeId === focusedNodeId
      ? { ...concealment, hiddenEntryPointIds: [], focusedNodeId: null }
      : { ...concealment, hiddenEntryPointIds: entryPointIdsAwayFrom(nodes, edges, nodeId), focusedNodeId: nodeId })
  }
  return (
    <DiagramBoard
      label={title}
      width={width}
      height={height}
      isFullScreen={isFullScreen}
      onFullScreenChange={(isOpening) => {
        setIsFullScreen(isOpening)
        if (!isOpening) setSelectedNodeId(null)
      }}
      onPanelClose={() => { setSelectedNodeId(null) }}
      actions={(
        <>
          <IconButton
            icon="collapse-all"
            label={COLLAPSE_ALL_LABEL}
            onClick={() => { conceal({ ...NOTHING_CONCEALED, hiddenEntryPointIds: entryPointIdsOf(nodes) }) }}
          />
          <IconButton icon="expand-all" label={EXPAND_ALL_LABEL} onClick={() => { conceal(NOTHING_CONCEALED) }} />
        </>
      )}
      panel={selectedNode === null
        ? null
        : (
            <DiagramNodePanel
              title={selectedNode.label}
              kindLabel={selectedNode.kindLabel}
              target={selectedNode.tracedCode ?? selectedTarget}
              onClose={() => { setSelectedNodeId(null) }}
            >
              {selectedNode.description === null
                ? null
                : <Prose blocks={selectedNode.description} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
              {selectedNode.tracedHeading === null
                ? null
                : <h4 className="text-xs font-bold text-muted-foreground">{selectedNode.tracedHeading}</h4>}
            </DiagramNodePanel>
          )}
    >
      <DiagramEdges width={width} height={height}>
        {(markers) => drawnEdges.map((edge) => (
          <DiagramEdge
            key={edge.id}
            path={smoothPath(edge.points)}
            kind={EDGE_KIND}
            isAssumed={false}
            emphasis={emphasisOf(edge.id, selected.edgeIds, hovered.edgeIds)}
            markers={markers}
          />
        ))}
      </DiagramEdges>
      {shownCards.map((card) => <UiCardShell key={card.id} card={card} />)}
      {shownCards.flatMap((card) => card.frames.map((frame) => (
        <FrameBox
          key={frame.key}
          frame={frame}
          emphasis={frame.nodeId === null ? null : emphasisOf(frame.nodeId, selected.nodeIds, hovered.nodeIds)}
          isSelected={frame.nodeId !== null && frame.nodeId === selectedNodeId}
          isHidden={isFrameHidden(frame, hiddenIds)}
          onSelect={() => { if (frame.nodeId !== null) selectNode(frame.nodeId) }}
          onHoverChange={(isHovered) => { setHoveredNodeId(isHovered ? frame.nodeId : null) }}
        />
      )))}
      {shownCards.flatMap((card) => card.triggers.map((trigger) => (
        <TriggerRow
          key={trigger.key}
          trigger={trigger}
          emphasis={emphasisOf(trigger.entryPointId, selected.nodeIds, hovered.nodeIds)}
          isSelected={trigger.entryPointId === selectedNodeId}
          isPathHidden={hiddenEntryPointIds.includes(trigger.entryPointId)}
          onSelect={() => { selectNode(trigger.entryPointId) }}
          onHoverChange={(isHovered) => { setHoveredNodeId(isHovered ? trigger.entryPointId : null) }}
          onPathToggle={() => { conceal({ ...concealment, hiddenEntryPointIds: toggled(hiddenEntryPointIds, trigger.entryPointId) }) }}
        />
      )))}
      {shownCards.flatMap((card) => [
        ...card.frames.filter((frame) => frame.hasLineOut && !isFrameHidden(frame, hiddenIds)).map((frame) => (
          <CardLine key={`${frame.key}:out`} fromX={frame.x + frame.width} edgeX={card.x + card.width} y={frame.y + FRAME_HEADER_CENTER_PX} />
        )),
        ...card.frames.filter((frame) => frame.hasLineIn && !isFrameHidden(frame, hiddenIds)).map((frame) => (
          <CardLine key={`${frame.key}:in`} fromX={frame.x} edgeX={card.x} y={frame.y + FRAME_HEADER_CENTER_PX} />
        )),
        ...card.triggers.filter((trigger) => !hiddenEntryPointIds.includes(trigger.entryPointId)).map((trigger) => (
          <CardLine key={`${trigger.key}:out`} fromX={trigger.x + trigger.width} edgeX={card.x + card.width} y={trigger.y + trigger.height / HALF} />
        )),
      ])}
      {shownNodes.filter((node) => !node.isInsideCard).map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          emphasis={emphasisOf(node.id, selected.nodeIds, hovered.nodeIds)}
          isSelected={node.id === selectedNodeId}
          isPathHidden={hiddenEntryPointIds.includes(node.id)}
          isFocusedOn={node.id === focusedNodeId}
          onSelect={() => { selectNode(node.id) }}
          onHoverChange={(isHovered) => { setHoveredNodeId(isHovered ? node.id : null) }}
          onPathToggle={() => { conceal({ ...concealment, hiddenEntryPointIds: toggled(hiddenEntryPointIds, node.id) }) }}
          onFocusToggle={() => { toggleFocus(node.id) }}
          onCollapse={() => { conceal({ ...concealment, collapsedNodeIds: toggled(collapsedNodeIds, node.id) }) }}
        />
      ))}
      {expandPoints.map(({ key, node, point }) => (
        <button
          key={key}
          type="button"
          aria-label={`${EXPAND_LABEL}: ${node.label}`}
          className={cn("group/hint hover:z-20 focus-visible:z-20", EXPAND_BUTTON_CLASSES)}
          style={{ left: point.x, top: point.y }}
          onClick={() => { conceal({ ...concealment, collapsedNodeIds: toggled(collapsedNodeIds, node.id) }) }}
        >
          <ChevronsUpDownIcon aria-hidden="true" className="size-3.5" />
          <HoverHint text={`${EXPAND_HINT}: ${node.label}`} />
        </button>
      ))}
    </DiagramBoard>
  )
}

export default JourneyFlowDiagram
