import { useState } from "react"
import DiagramBoard from "@/components/DiagramBoard"
import DiagramEdges, { DiagramEdge } from "@/components/DiagramEdges"
import DiagramNodePanel from "@/components/DiagramNodePanel"
import Prose from "@/components/Prose"
import VerdictMark, { type Verdict } from "@/components/VerdictMark"
import { acrossPath, withinPath, type Point } from "@/lib/diagram-path"
import type { CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export interface BlastNode {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
  readonly verdict: Verdict
  readonly verdictLabel: string
  readonly label: string
  readonly isDraft: boolean
  readonly shieldLabel: string | null
  readonly contract: {
    readonly beforeLabel: string
    readonly before: ProseBlocks | null
    readonly absentLabel: string
    readonly nowLabel: string
    readonly now: ProseBlocks
  } | null
  readonly effect: ProseBlocks | null
  readonly codeLinkId: string | null
}

export interface BlastEdge {
  readonly id: string
  readonly kind: "call" | "value" | "data"
  readonly isAssumed: boolean
  readonly route: "across" | "within"
  readonly points: readonly Point[]
}

export interface BlastBoard {
  readonly width: number
  readonly height: number
  readonly zones: readonly { readonly label: string, readonly x: number, readonly width: number }[]
  readonly files: readonly {
    readonly id: string
    readonly label: string
    readonly x: number
    readonly y: number
    readonly width: number
    readonly height: number
  }[]
  readonly nodes: readonly BlastNode[]
  readonly edges: readonly BlastEdge[]
}

interface BlastDiagramProps {
  readonly title: string
  readonly board: BlastBoard
  readonly codeLinks: CodeLinkTargets
  readonly onOpenCodeLink: (anchorId: string) => void
}

const VERDICT_TEXT_CLASSES: Record<Verdict, string> = {
  "changed": "font-bold text-foreground",
  "breaks": "font-bold text-destructive",
  "behaviour-changes": "font-bold text-foreground",
  "unaffected": "text-muted-foreground",
  "unassessed": "text-muted-foreground",
}

const ZONE_BLEED_PX = 12
const BOTH_SIDES = 2

const NODE_CLASSES = "absolute flex flex-col justify-center gap-1 rounded-md border border-input bg-card px-3 text-left transition-[outline-color] duration-[180ms] ease-out hover:outline-2 hover:outline-(--line) aria-pressed:outline-2 aria-pressed:outline-(--line) data-[verdict=changed]:border-2 data-[verdict=changed]:border-foreground"

const BlastDiagram = ({ title, board, codeLinks, onOpenCodeLink }: BlastDiagramProps) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const selectedNode = board.nodes.find((node) => node.id === selectedNodeId) ?? null
  const selectedTarget = selectedNode?.codeLinkId == null || !Object.hasOwn(codeLinks, selectedNode.codeLinkId)
    ? null
    : codeLinks[selectedNode.codeLinkId]
  return (
    <DiagramBoard
      label={title}
      width={board.width}
      height={board.height}
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
              kindLabel={selectedNode.verdictLabel}
              target={selectedTarget}
              onClose={() => { setSelectedNodeId(null) }}
            >
              {selectedNode.shieldLabel === null ? null : <p className="text-muted-foreground">{selectedNode.shieldLabel}</p>}
              {selectedNode.contract === null
                ? null
                : (
                    <dl className="flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs font-bold text-muted-foreground">{selectedNode.contract.beforeLabel}</dt>
                        <dd>
                          {selectedNode.contract.before === null
                            ? <p className="text-muted-foreground">{selectedNode.contract.absentLabel}</p>
                            : <Prose blocks={selectedNode.contract.before} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
                        </dd>
                      </div>
                      <div className="flex flex-col gap-1">
                        <dt className="text-xs font-bold text-muted-foreground">{selectedNode.contract.nowLabel}</dt>
                        <dd><Prose blocks={selectedNode.contract.now} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} /></dd>
                      </div>
                    </dl>
                  )}
              {selectedNode.effect === null
                ? null
                : <Prose blocks={selectedNode.effect} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
            </DiagramNodePanel>
          )}
    >
      {board.zones.map((zone) => (
        <div
          key={zone.label}
          className="absolute inset-y-0 border-x border-dashed border-border px-2 pt-6 text-[0.8125rem] leading-5 font-bold"
          style={{ left: zone.x - ZONE_BLEED_PX, width: zone.width + ZONE_BLEED_PX * BOTH_SIDES }}
        >
          {zone.label}
        </div>
      ))}
      {board.files.map((file) => (
        <div
          key={file.id}
          className="absolute border-t border-l border-border"
          style={{ left: file.x, top: file.y, width: file.width, height: file.height }}
        >
          <p className="truncate px-2 pt-1.5 font-mono text-[0.6875rem] leading-4 text-muted-foreground" title={file.label}>
            {file.label}
          </p>
        </div>
      ))}
      <DiagramEdges width={board.width} height={board.height}>
        {(markers) => board.edges.map((edge) => (
          <DiagramEdge
            key={edge.id}
            path={edge.route === "across" ? acrossPath(edge.points) : withinPath(edge.points)}
            kind={edge.kind}
            isAssumed={edge.isAssumed}
            markers={markers}
          />
        ))}
      </DiagramEdges>
      {board.nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          aria-pressed={node.id === selectedNodeId}
          data-verdict={node.verdict}
          className={NODE_CLASSES}
          style={{ left: node.x, top: node.y, width: node.width, height: node.height }}
          onClick={() => {
            setSelectedNodeId(node.id)
            setIsFullScreen(true)
          }}
        >
          <span className="truncate font-mono text-[0.8125rem] leading-4 font-bold">{node.label}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-[0.6875rem] leading-4">
            <VerdictMark verdict={node.verdict} className="size-3.5" />
            <span className={cn("shrink-0", VERDICT_TEXT_CLASSES[node.verdict])}>{node.verdictLabel}</span>
            {node.shieldLabel === null ? null : <span className="truncate text-muted-foreground">{node.shieldLabel}</span>}
          </span>
        </button>
      ))}
    </DiagramBoard>
  )
}

export default BlastDiagram
