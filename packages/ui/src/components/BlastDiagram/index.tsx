import { useId, useState, type ReactNode } from "react"
import BlastFileMark, { blastFileMarkSizeOf, isQuietBlastFileMark, type BlastFileMarkKind } from "@/components/BlastFileMark"
import Button from "@/components/blocks/button"
import DiagramBoard from "@/components/DiagramBoard"
import DiagramNodePanel from "@/components/DiagramNodePanel"
import Prose from "@/components/Prose"
import Unwritten from "@/components/Unwritten"
import { straightPath, type Point } from "@/lib/diagram-path"
import { neighbourhoodOf, type Connection } from "@/lib/diagram-reach"
import type { CodeLinkTargets, ProseBlocks } from "@/lib/review-content"

interface BlastFileRow {
  readonly id: string
  readonly label: string
}

interface BlastFileList {
  readonly heading: string
  readonly emptyLabel: string
  readonly files: readonly BlastFileRow[]
}

export type BlastImpactChoice = "breaks" | "behaviour-changes" | "unaffected" | "unassessed"

export interface BlastAssessment {
  readonly impactType: BlastImpactChoice
  readonly impactReason: string
}

export interface BlastAuthoring {
  readonly editLabel: string
  readonly renderImpactEditor: (node: BlastNode, onClose: () => void) => ReactNode
}

export interface BlastNode {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly radius: number
  readonly mark: BlastFileMarkKind
  readonly markLabel: string
  readonly label: string
  readonly path: string
  readonly impactReason: ProseBlocks | null
  readonly impactNote: string | null
  readonly isUnassessed: boolean
  readonly assessment: BlastAssessment | null
  readonly importers: BlastFileList
  readonly imports: BlastFileList
  readonly fileLink: { readonly anchorId: string, readonly label: string } | null
}

export interface BlastEdge {
  readonly id: string
  readonly importerId: string
  readonly importedId: string
  readonly points: readonly Point[]
}

export interface BlastBoard {
  readonly width: number
  readonly height: number
  readonly nodes: readonly BlastNode[]
  readonly edges: readonly BlastEdge[]
}

interface BlastDiagramProps {
  readonly title: string
  readonly board: BlastBoard
  readonly codeLinks: CodeLinkTargets
  readonly authoring: BlastAuthoring | null
  readonly actions?: ReactNode
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onOpenFile: (anchorId: string) => void
}

type Standing = "focal" | "near" | "far" | "plain"

const HALF = 2
const ARROW_PATH = "M1 1.5 8 5 1 8.5z"

const NODE_CLASSES = "group absolute flex -translate-x-1/2 flex-col items-center rounded-sm text-center transition-opacity duration-[180ms] ease-out data-[standing=far]:opacity-25"
const LABEL_CLASSES = "mt-0.5 rounded-sm bg-background px-1 font-mono text-[0.6875rem] leading-4 whitespace-nowrap text-muted-foreground transition-colors duration-[180ms] ease-out group-hover:text-foreground group-data-[quiet=false]:text-foreground group-data-[standing=focal]:font-bold group-data-[standing=focal]:text-foreground group-data-[standing=near]:text-foreground"
const EDGE_CLASSES = "fill-none stroke-current opacity-55 transition-[color,opacity] duration-[180ms] ease-out [stroke-width:1.25] data-[standing=far]:opacity-15 data-[standing=near]:text-foreground data-[standing=near]:opacity-100"
const FILE_ROW_CLASSES = "block w-full rounded-sm px-2 py-1 text-left font-mono text-[0.8125rem] leading-5 wrap-anywhere hover:bg-muted"

const standingOf = (isFocal: boolean, isNear: boolean, hasFocus: boolean): Standing => {
  if (!hasFocus) return "plain"
  if (isFocal) return "focal"
  return isNear ? "near" : "far"
}

interface FileListProps {
  readonly list: BlastFileList
  readonly onSelect: (nodeId: string) => void
}

const FileList = ({ list, onSelect }: FileListProps) => (
  <div className="flex flex-col gap-1">
    <h4 className="text-xs font-bold text-muted-foreground tabular-nums">{list.heading}</h4>
    {list.files.length === 0
      ? <p className="text-muted-foreground">{list.emptyLabel}</p>
      : (
          <ul className="-mx-2 flex flex-col">
            {list.files.map((file) => (
              <li key={file.id}>
                <button type="button" className={FILE_ROW_CLASSES} onClick={() => { onSelect(file.id) }}>{file.label}</button>
              </li>
            ))}
          </ul>
        )}
  </div>
)

const BlastDiagram = ({ title, board, codeLinks, authoring, actions = null, onOpenCodeLink, onOpenFile }: BlastDiagramProps) => {
  const markerId = useId()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)
  const selectedNode = board.nodes.find((node) => node.id === selectedNodeId) ?? null
  const focalNodeId = hoveredNodeId ?? selectedNodeId
  const connections: Connection[] = board.edges.map((edge) => ({ id: edge.id, from: edge.importerId, to: edge.importedId }))
  const nearby = neighbourhoodOf(connections, focalNodeId)
  const hasFocus = focalNodeId !== null
  const canEditImpact = authoring !== null && selectedNode?.assessment != null
  const isEditingImpact = canEditImpact && editingNodeId === selectedNodeId
  const stopEditingImpact = (): void => {
    setEditingNodeId(null)
  }
  const closePanel = (): void => {
    setSelectedNodeId(null)
    stopEditingImpact()
  }
  return (
    <DiagramBoard
      label={title}
      width={board.width}
      height={board.height}
      isFullScreen={isFullScreen}
      isCentred
      actions={actions}
      onFullScreenChange={(isOpening) => {
        setIsFullScreen(isOpening)
        if (!isOpening) closePanel()
      }}
      onPanelClose={closePanel}
      panel={selectedNode === null
        ? null
        : (
            <DiagramNodePanel title={selectedNode.path} titleKind="code" kindLabel={selectedNode.markLabel} target={null} onClose={closePanel}>
              {isEditingImpact ? authoring.renderImpactEditor(selectedNode, stopEditingImpact) : null}
              {isEditingImpact || selectedNode.impactNote === null
                ? null
                : (
                    <Unwritten isPending={selectedNode.isUnassessed} lineCount={2}>
                      <p className="text-muted-foreground">{selectedNode.impactNote}</p>
                    </Unwritten>
                  )}
              {isEditingImpact || selectedNode.impactReason === null
                ? null
                : <Prose blocks={selectedNode.impactReason} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />}
              {canEditImpact && !isEditingImpact
                ? <Button variant="link" size="sm" className="self-start px-0" onClick={() => { setEditingNodeId(selectedNode.id) }}>{authoring.editLabel}</Button>
                : null}
              <FileList list={selectedNode.importers} onSelect={setSelectedNodeId} />
              <FileList list={selectedNode.imports} onSelect={setSelectedNodeId} />
              {selectedNode.fileLink === null
                ? null
                : (
                    <button
                      type="button"
                      className="self-start rounded-md border border-input bg-card px-2.5 py-1 text-[0.8rem] hover:bg-muted"
                      onClick={() => {
                        const { anchorId } = selectedNode.fileLink ?? { anchorId: null }
                        setIsFullScreen(false)
                        closePanel()
                        if (anchorId !== null) onOpenFile(anchorId)
                      }}
                    >
                      {selectedNode.fileLink.label}
                    </button>
                  )}
            </DiagramNodePanel>
          )}
    >
      <svg
        aria-hidden="true"
        width={board.width}
        height={board.height}
        viewBox={`0 0 ${String(board.width)} ${String(board.height)}`}
        className="pointer-events-none absolute inset-0 text-muted-foreground"
      >
        <defs>
          <marker id={markerId} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d={ARROW_PATH} fill="context-stroke" />
          </marker>
        </defs>
        {board.edges.map((edge) => (
          <path
            key={edge.id}
            d={straightPath(edge.points)}
            data-standing={standingOf(false, nearby.edgeIds.has(edge.id), hasFocus)}
            markerEnd={`url(#${markerId})`}
            className={EDGE_CLASSES}
          />
        ))}
      </svg>
      {board.nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          title={node.path}
          aria-pressed={node.id === selectedNodeId}
          data-mark={node.mark}
          data-quiet={isQuietBlastFileMark(node.mark)}
          data-standing={standingOf(node.id === focalNodeId, nearby.nodeIds.has(node.id), hasFocus)}
          className={NODE_CLASSES}
          style={{ left: node.x, top: node.y - blastFileMarkSizeOf(node.radius) / HALF }}
          onPointerEnter={() => { setHoveredNodeId(node.id) }}
          onPointerLeave={() => { setHoveredNodeId(null) }}
          onFocus={() => { setHoveredNodeId(node.id) }}
          onBlur={() => { setHoveredNodeId(null) }}
          onClick={() => {
            setSelectedNodeId(node.id)
            setIsFullScreen(true)
          }}
        >
          <BlastFileMark mark={node.mark} radius={node.radius} />
          <span className={LABEL_CLASSES}>{node.label}</span>
          {isQuietBlastFileMark(node.mark) ? null : <span className="rounded-sm bg-background px-1 text-[0.6875rem] leading-4 text-muted-foreground">{node.markLabel}</span>}
        </button>
      ))}
    </DiagramBoard>
  )
}

export default BlastDiagram
