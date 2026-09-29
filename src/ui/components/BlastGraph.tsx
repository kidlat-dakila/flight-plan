import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react"
import { useCallback, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { BlastEdge } from "./BlastEdge"
import { BlastFileCard, BlastNodeCard } from "./BlastNodeCard"
import { FullScreenButton, useMaximisedBoard } from "./maximise"
import type { Blast } from "../../lib/schemas/diagram/blast"
import {
  BLAST_NODE_HEIGHT,
  BLAST_NODE_WIDTH,
  blastExtent,
  groupsOf,
  layoutBlast,
  openOnArrival,
  pathOfFileNode,
  projectBlast,
} from "../diagram/blastLayout"

/**
 * The blast radius, drawn.
 *
 * Thin on purpose. Every decision worth arguing about — which ring a node sits
 * on, which file folds, which edges survive folding, what a folded card claims —
 * is made in `diagram/blastLayout.ts`, where it is pure and tested. What is left
 * here is React Flow's own vocabulary and the two pieces of state the layout
 * cannot hold: what the reviewer has opened, and whether the board is filling
 * the panel.
 *
 * The same host as `Diagram`, deliberately, down to sharing the maximise hook
 * and its stylesheet: the two boards answer different questions about one change
 * and a reviewer moves between them, so they had better pan, zoom and maximise
 * the same way.
 */

const nodeTypes = { declaration: BlastNodeCard, file: BlastFileCard }

/* One kind, and it is the only kind: see `BlastEdge`. */
const edgeTypes = { blast: BlastEdge }

/**
 * The arrowhead, which is what makes an edge a dependency rather than a line.
 *
 * Without it "A depends on B" and "B depends on A" are the same picture, and on
 * a board whose whole claim is which way a change travels that is not a detail.
 *
 * The colour is here rather than in `blast.css` because React Flow draws the
 * marker with an inline `fill` and `stroke` — defaulting to `none`, so an
 * uncoloured arrow is an invisible one, and no stylesheet can win against the
 * attribute afterwards. A theme variable still does the work: custom properties
 * inherit into the `<defs>` like anywhere else. Keep it in step with the edge
 * stroke in `blast.css`.
 */
const ARROW = {
  type: MarkerType.ArrowClosed,
  width: 14,
  height: 14,
  color: "var(--fp-fg-faint)",
} as const

export type BlastGraphProps = {
  blast: Blast
}

export function BlastGraph({ blast }: BlastGraphProps): JSX.Element {
  const groups = useMemo(() => groupsOf(blast), [blast])
  const placements = useMemo(() => layoutBlast(blast.nodes, blast.edges), [blast])
  const [open, setOpen] = useState<ReadonlySet<string>>(() => openOnArrival(groups))

  const { full, setFull, figureRef, layer } = useMaximisedBoard({
    layerClass: "fp-dg-layer",
  })

  const projected = useMemo(
    () => projectBlast(blast, open, placements),
    [blast, open, placements],
  )

  const nodes: Node[] = useMemo(
    () =>
      projected.nodes.map((one) => ({
        id: one.id,
        type: one.kind === "node" ? "declaration" : "file",
        position: { x: one.x, y: one.y },
        data: one.kind === "node" ? { node: one.node } : { group: one.group },
        width: BLAST_NODE_WIDTH,
        height: BLAST_NODE_HEIGHT,
      })),
    [projected],
  )

  /*
   * Taller for a bigger blast, up to a point.
   *
   * The same floor-and-ceiling the diagram uses, and it matters more here now
   * that every declaration arrives drawn: a hop holding two dozen dependents is
   * a ring two thousand pixels across, and framed into 420 it is a picture of
   * grey specks. Past the ceiling the reader pans or goes full screen.
   *
   * Only the in-column board takes this. The full-screen copy is sized by the
   * layer, and an inline height would beat the rule that does it.
   */
  const extent = useMemo(() => blastExtent(projected.nodes), [projected])
  const height =
    extent === null
      ? undefined
      : { height: `clamp(420px, ${String(Math.round(extent.height + 48))}px, 40rem)` }

  const edges: Edge[] = useMemo(
    () =>
      projected.edges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "blast",
        markerEnd: ARROW,
        /* A folded edge stands for several, so it is drawn heavier. */
        className: edge.crossing ? "fp-bl-edge fp-bl-crossing" : "fp-bl-edge",
      })),
    [projected],
  )

  /*
   * One handler for every click on the board.
   *
   * A card click asks to see the map, so the first one takes the board over the
   * panel — the same gesture, and the same reasoning, as the diagram. It does
   * not open a file: a blast node is a position in a graph rather than a place
   * to go, and sending a reader into an editor is the opposite of what somebody
   * scanning a hundred dependents wants.
   *
   * A folded file still folds open on the same click, so the gesture never does
   * nothing: at worst it maximises, at best it maximises and opens the file the
   * reader aimed at.
   */
  const onNodeClick = useCallback(
    (_event: unknown, node: Node) => {
      if (!full) setFull(true)
      if (node.type !== "file") return
      const path = pathOfFileNode(node.id)
      if (path === null) return
      setOpen((was) => {
        const next = new Set(was)
        if (!next.delete(path)) next.add(path)
        return next
      })
    },
    [full, setFull],
  )

  /*
   * The banner the symbol seed exists behind.
   *
   * A hypothesis-seeded board's verdicts assess a change nobody has written, and
   * that is weaker than everything else in this format. The status lives on the
   * artifact, where a reader meets it, rather than in the memory of whoever ran
   * it.
   */
  const hypothesis = "symbol" in blast.seed ? blast.seed.symbol.hypothesis : null

  const board = (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={onNodeClick}
      nodesDraggable={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      fitView
    >
      <Background />
      <Controls showInteractive={false}>
        <FullScreenButton full={full} onToggle={() => setFull(!full)} />
      </Controls>
    </ReactFlow>
  )

  return (
    <figure className="fp-bl" ref={figureRef}>
      {hypothesis === null ? null : (
        <div className="fp-bl-banner" role="note">
          These verdicts assess a stated change rather than a diff: “{hypothesis}”.
        </div>
      )}
      {blast.notes.map((note) => (
        <div className="fp-bl-note" key={note}>
          {note}
        </div>
      ))}
      {/*
        Empty while the board is on the full-screen layer. Nothing renders it
        twice: the portal moves the DOM subtree out, and leaving a copy behind
        would mount a second React Flow on the same ids.
      */}
      <div className="fp-bl-board" style={height}>
        {layer === null ? board : null}
      </div>
      {layer === null
        ? null
        : createPortal(<div className="fp-bl-board">{board}</div>, layer)}
    </figure>
  )
}
