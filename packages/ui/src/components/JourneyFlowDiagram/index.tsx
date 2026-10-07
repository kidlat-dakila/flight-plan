import {
  AppWindowIcon,
  BracesIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  CrosshairIcon,
  DatabaseIcon,
  EyeIcon,
  EyeOffIcon,
  PlayIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import CodeBlock from "@/components/CodeBlock"
import DiagramBoard from "@/components/DiagramBoard"
import DiagramEdges, { DiagramEdge, type EdgeKind, type Emphasis } from "@/components/DiagramEdges"
import DiagramNodePanel from "@/components/DiagramNodePanel"
import IconButton from "@/components/IconButton"
import Prose from "@/components/Prose"
import { pointBeyondEnd, smoothPath, type Point } from "@/lib/diagram-path"
import { cutOffBy, hiddenBehind, lineageOf, neighbourhoodOf, pathFrom, sourcesLeadingTo, type Neighbourhood } from "@/lib/diagram-reach"
import type { CodeLine, CodeLinkTarget, CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export type NodeCategory = "guard" | "logic" | "data" | "type" | "ui" | "config"

export type NodeChange = "added" | "modified"

export interface JourneyFrame {
  readonly label: string
  readonly pathLabel: string
  readonly changedLabel: string | null
  readonly lines: readonly CodeLine[]
}

export interface JourneyCallStack {
  readonly label: string
  readonly frames: readonly JourneyFrame[]
}

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
  readonly callStackHeading: string | null
  readonly callStacks: readonly JourneyCallStack[]
}

export interface JourneyEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly kind: EdgeKind
  readonly isAssumed: boolean
  readonly points: readonly Point[]
  readonly label: { readonly text: string, readonly x: number, readonly y: number } | null
}

interface JourneyFlowDiagramProps {
  readonly title: string
  readonly width: number
  readonly height: number
  readonly nodes: readonly JourneyNode[]
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

const borderClassesOf = ({ kind, change }: JourneyNode, emphasis: Emphasis | null): string => {
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

interface CallStacksProps {
  readonly heading: string
  readonly callStacks: readonly JourneyCallStack[]
}

const FRAME_KEY_SEPARATOR = "|"

const frameKeyOf = (callStack: JourneyCallStack, frame: JourneyFrame): string =>
  [callStack.label, frame.pathLabel, frame.label].join(FRAME_KEY_SEPARATOR)

const CallStacks = ({ heading, callStacks }: CallStacksProps) => {
  const [openFrameKeys, setOpenFrameKeys] = useState<readonly string[]>([])
  return (
    <section aria-label={heading} className="flex flex-col gap-3">
      <h4 className="text-xs font-bold text-muted-foreground">{heading}</h4>
      {callStacks.map((callStack) => (
        <section key={callStack.label} aria-label={callStack.label} className="flex flex-col gap-1">
          <h5 className="text-xs font-bold">{callStack.label}</h5>
          <ol className="flex flex-col gap-2">
            {callStack.frames.map((frame) => {
              const frameKey = frameKeyOf(callStack, frame)
              const isOpen = openFrameKeys.includes(frameKey)
              return (
                <li key={frameKey} className="overflow-clip rounded-md border">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    className={cn("flex h-11 w-full items-center gap-2 bg-muted pr-3 pl-2 text-left", isOpen && frame.lines.length > 0 && "border-b")}
                    onClick={() => { setOpenFrameKeys((keys) => toggled(keys, frameKey)) }}
                  >
                    <ChevronRightIcon
                      aria-hidden="true"
                      className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-[180ms] ease-out", isOpen ? "rotate-90" : "")}
                    />
                    <span className="flex min-w-0 flex-col justify-center">
                      <span role="heading" aria-level={6} className="truncate text-[0.9375rem] leading-5 font-semibold" title={frame.label}>{frame.label}</span>
                      <span className="truncate font-mono text-xs leading-4 text-muted-foreground" title={frame.pathLabel}>{frame.pathLabel}</span>
                    </span>
                    <span className="flex-1" />
                    {frame.changedLabel === null ? null : <span className="shrink-0 text-xs text-muted-foreground">{frame.changedLabel}</span>}
                  </button>
                  {isOpen && frame.lines.length > 0
                    ? <CodeBlock lines={frame.lines} label={`${frame.label}, ${frame.pathLabel}`} isWrapped className="py-0" />
                    : null}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </section>
  )
}

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

const JourneyFlowDiagram = ({ title, width, height, nodes, edges, codeLinks, onOpenCodeLink }: JourneyFlowDiagramProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [concealment, setConcealment] = useState<Concealment>(NOTHING_CONCEALED)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const { hiddenEntryPointIds, collapsedNodeIds, focusedNodeId } = concealment
  const hiddenIds = hiddenNodeIdsOf(nodes, edges, concealment)
  const shownNodes = nodes.filter((node) => !hiddenIds.has(node.id))
  const shownEdges = edges.filter((edge) => isEdgeShown(edge, hiddenIds, concealment))
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
              {selectedNode.callStackHeading === null
                ? null
                : <CallStacks key={selectedNode.id} heading={selectedNode.callStackHeading} callStacks={selectedNode.callStacks} />}
            </DiagramNodePanel>
          )}
    >
      <DiagramEdges width={width} height={height}>
        {(markers) => shownEdges.map((edge) => (
          <DiagramEdge
            key={edge.id}
            path={smoothPath(edge.points)}
            kind={edge.kind}
            isAssumed={edge.isAssumed}
            emphasis={emphasisOf(edge.id, selected.edgeIds, hovered.edgeIds)}
            markers={markers}
          />
        ))}
      </DiagramEdges>
      {shownEdges.map((edge) => (edge.label === null
        ? null
        : (
            <span
              key={edge.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 bg-background px-1 text-[0.6875rem] leading-4 whitespace-nowrap text-muted-foreground"
              style={{ left: edge.label.x, top: edge.label.y }}
            >
              {edge.label.text}
            </span>
          )))}
      {shownNodes.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          emphasis={emphasisOf(node.id, selected.nodeIds, hovered.nodeIds)}
          isSelected={node.id === selectedNodeId}
          isPathHidden={hiddenEntryPointIds.includes(node.id)}
          isFocusedOn={node.id === focusedNodeId}
          onSelect={() => {
            setSelectedNodeId(node.id)
            setIsFullScreen(true)
          }}
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
