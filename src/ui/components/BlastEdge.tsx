import { BaseEdge, getStraightPath, useInternalNode, type EdgeProps } from "@xyflow/react"
import {
  BLAST_NODE_HEIGHT,
  BLAST_NODE_WIDTH,
  borderPoint,
  type CardRect,
} from "../diagram/blastLayout"

/**
 * An edge that meets a card wherever the line actually reaches it.
 *
 * React Flow's own edges run between handles, and a handle is one of four
 * sides. That is right for the code diagram, where dagre puts every edge on an
 * axis and `sidesFor` can name which. It is wrong here: the blast radius is
 * radial, cards sit at every angle, and pinning the ends to top and bottom drew
 * lines that left the underside of a card to reach one beside it and curled
 * back on themselves doing it.
 *
 * So this edge ignores handles. It draws the straight line between the two
 * cards' centres and clips each end to that card's border, which is what makes
 * an edge point *at* a box rather than at the side of one. The geometry is
 * `borderPoint`, kept in `blastLayout` with the rest of the pure work so it can
 * be tested without mounting anything.
 *
 * Straight rather than curved, now the ends are honest. A bezier existed to
 * hide the detour that fixed handles forced; with the detour gone the curve had
 * nothing left to do but make two edges leaving one card hard to tell apart.
 */

/** What React Flow knows about a card's box, in the shape the geometry wants. */
function rectOf(node: {
  internals: { positionAbsolute: { x: number; y: number } }
  measured?: { width?: number | null; height?: number | null } | null
}): CardRect {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    /*
     * The measured size, or the size the layout asked for.
     *
     * They agree — the cards are a fixed 176×82 and the layout is told so — but
     * the measurement lands a frame after mount, and an edge drawn against a
     * null width would spend that frame as a dot at the card's corner.
     */
    width: node.measured?.width ?? BLAST_NODE_WIDTH,
    height: node.measured?.height ?? BLAST_NODE_HEIGHT,
  }
}

const centreOf = (rect: CardRect) => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
})

export function BlastEdge({ id, source, target, markerEnd, style }: EdgeProps): JSX.Element | null {
  const from = useInternalNode(source)
  const to = useInternalNode(target)
  // A frame before both cards exist there is nothing to draw between.
  if (from === undefined || to === undefined) return null

  const fromRect = rectOf(from)
  const toRect = rectOf(to)
  const start = borderPoint(fromRect, centreOf(toRect))
  const end = borderPoint(toRect, centreOf(fromRect))

  const [path] = getStraightPath({
    sourceX: start.x,
    sourceY: start.y,
    targetX: end.x,
    targetY: end.y,
  })

  return <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
}
