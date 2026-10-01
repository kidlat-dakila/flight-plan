import {
  AppWindowIcon,
  BracesIcon,
  DatabaseIcon,
  PlayIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  WorkflowIcon,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import DiagramBoard from "@/components/DiagramBoard"
import DiagramEdges, { DiagramEdge, type EdgeKind } from "@/components/DiagramEdges"
import DiagramNodePanel from "@/components/DiagramNodePanel"
import Prose from "@/components/Prose"
import { smoothPath, type Point } from "@/lib/diagram-path"
import type { CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export type NodeCategory = "guard" | "logic" | "data" | "type" | "ui" | "config"

export interface JourneyNode {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly kind: "entry-point" | "head" | "tail"
  readonly category: NodeCategory | null
  readonly kindLabel: string
  readonly changedLabel: string | null
  readonly label: string
  readonly isDraft: boolean
  readonly sublabel: string | null
  readonly description: ProseBlocks | null
  readonly codeLinkId: string | null
}

export interface JourneyEdge {
  readonly id: string
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
  "entry-point": "flex-row items-center gap-2 border-sign bg-sign px-3 text-sign-foreground dark:border-input",
  "head": "flex-col justify-center gap-1 border-2 border-foreground bg-card px-3",
  "tail": "flex-col justify-center gap-1 border-input bg-card px-3",
}

const NODE_BASE_CLASSES = "absolute flex rounded-md border text-left transition-[outline-color] duration-[180ms] ease-out hover:outline-2 hover:outline-(--line) aria-pressed:outline-2 aria-pressed:outline-(--line)"

interface NodeButtonProps {
  readonly node: JourneyNode
  readonly isSelected: boolean
  readonly onSelect: () => void
}

const NodeButton = ({ node, isSelected, onSelect }: NodeButtonProps) => {
  const CategoryIcon = node.category === null ? PlayIcon : CATEGORY_ICONS[node.category]
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      data-kind={node.kind}
      className={cn(NODE_BASE_CLASSES, NODE_CLASSES[node.kind])}
      style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
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
                {node.changedLabel === null
                  ? null
                  : <span className="ml-auto font-bold text-foreground">{node.changedLabel}</span>}
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
  )
}

const JourneyFlowDiagram = ({ title, width, height, nodes, edges, codeLinks, onOpenCodeLink }: JourneyFlowDiagramProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedTarget = selectedNode?.codeLinkId == null || !Object.hasOwn(codeLinks, selectedNode.codeLinkId)
    ? null
    : codeLinks[selectedNode.codeLinkId]
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
      panel={selectedNode === null
        ? null
        : (
            <DiagramNodePanel
              title={selectedNode.label}
              kindLabel={selectedNode.kindLabel}
              target={selectedTarget}
              onClose={() => { setSelectedNodeId(null) }}
            >
              {selectedNode.description === null
                ? null
                : <Prose blocks={selectedNode.description} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
            </DiagramNodePanel>
          )}
    >
      <DiagramEdges width={width} height={height}>
        {(markers) => edges.map((edge) => (
          <DiagramEdge key={edge.id} path={smoothPath(edge.points)} kind={edge.kind} isAssumed={edge.isAssumed} markers={markers} />
        ))}
      </DiagramEdges>
      {edges.map((edge) => (edge.label === null
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
      {nodes.map((node) => (
        <NodeButton
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          onSelect={() => {
            setSelectedNodeId(node.id)
            setIsFullScreen(true)
          }}
        />
      ))}
    </DiagramBoard>
  )
}

export default JourneyFlowDiagram
