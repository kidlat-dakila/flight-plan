import dagre from "dagre"
import type { Diagram, DiagramNode, EdgeKind } from "../../lib/schemas/diagram/schema"

/**
 * Places nodes with automatic dagre layout.
 *
 * `dagre` because it is pure JavaScript with no WASM, which the code panel's
 * highlighter has already taught this project to care about, and because a
 * layered left-to-right graph is what a code diagram *is*: control arrives,
 * passes a check, reaches storage.
 *
 * The pipeline emits no placement hints, so every node is laid out
 * automatically — a function and its execution steps top to bottom, the
 * functions against each other left to right.
 */

/** Card width, matching the CSS. Layout has to know it to avoid overlaps. */
export const NODE_WIDTH = 208

/** The CSS `min-height`: what a card with a one-line label comes out at. */
export const NODE_HEIGHT = 76

/**
 * Separation dagre is asked for, in pixels.
 *
 * Top to bottom, so `ranksep` is the gap between one level and the next and
 * `nodesep` the gap between siblings side by side. Both are generous because
 * the cards are large and carry a left-edge colour: two cards 12px apart read
 * as one striped block.
 *
 * `nodesep` is the larger of the two, which is the opposite of what it was when
 * the board ran left to right. Siblings are now horizontal neighbours and a
 * card is 208px wide against 76 tall, so the axis that needs the room changed
 * with the direction.
 */
const NODE_SEPARATION = 72
const RANK_SEPARATION = 64
/** Space for an edge's own label, which dagre places on the edge. */
const EDGE_SEPARATION = 24

/*
 * Estimating a card's height, so dagre can keep cards apart.
 *
 * dagre spaces nodes by the sizes it is given, so a flat `NODE_HEIGHT` for
 * every card is a promise the CSS does not keep: `min-height` is a floor, and a
 * label that wraps makes the card taller than the layout believes. The layout
 * then leaves exactly `nodesep` between cards it thinks are 76px tall and they
 * overlap.
 *
 * Measuring would be exact and needs a render pass that has not happened yet:
 * positions are wanted before anything is drawn. So the height is estimated
 * from the text, which only has to be right about *how many lines wrap*. The
 * numbers below come from the card's own rules — 4px padding either side, a 2px
 * gap between rows, and the three text sizes.
 */
const CARD_PADDING = 8
const CARD_GAP = 2
const TYPE_LINE = 15
const LABEL_LINE = 18
const SUBLABEL_LINE = 15
/*
 * Characters that fit on one line, at each size, inside 208px less padding.
 *
 * These changed when the two rows swapped fonts. The label is prose now — what
 * the node does — so it is set in the interface font, where an average
 * character is about half its size; the sublabel is the identifier, set in the
 * monospace font, where every character is about six tenths. Same widths, two
 * different divisors, and using the old numbers would have under-estimated the
 * label's width and over-estimated the sublabel's.
 *
 * Deliberately a little conservative in both directions: over-estimating a
 * card's height leaves a gap, while under-estimating it makes two cards
 * overlap, and only one of those is a bug.
 */
const LABEL_CHARS = 33
const SUBLABEL_CHARS = 30

function wrapped(text: string, perLine: number): number {
  return Math.max(1, Math.ceil(text.length / perLine))
}

/**
 * What a card will come out at, or `NODE_HEIGHT` if that is taller.
 *
 * Never returns less than the CSS floor, because a card cannot be shorter than
 * its `min-height` and telling the layout otherwise reintroduces the overlap
 * this exists to prevent.
 */
export function cardHeight(node: DiagramNode): number {
  const rows = [TYPE_LINE, wrapped(node.label, LABEL_CHARS) * LABEL_LINE]
  if (node.sublabel !== undefined) {
    rows.push(wrapped(node.sublabel, SUBLABEL_CHARS) * SUBLABEL_LINE)
  }
  const total =
    CARD_PADDING +
    rows.reduce((sum, row) => sum + row, 0) +
    CARD_GAP * (rows.length - 1)
  return Math.max(NODE_HEIGHT, total)
}

export type Placed = { id: string; x: number; y: number; width: number; height: number }

export function layout(diagram: Diagram): Map<string, Placed> {
  const placed = new Map<string, Placed>()

  const size = (node: DiagramNode) => ({
    width: NODE_WIDTH,
    height: cardHeight(node),
  })

  const automatic = [...diagram.nodes]
  if (automatic.length === 0) return placed

  /*
   * Two axes, laid out in two passes.
   *
   * A board answers two questions at once and they are not the same shape.
   * *What calls what* runs **across**: one function per column, left to right,
   * which is how a call stack has always been drawn and what leaves the deep
   * one at the right-hand end where a reviewer looks for it. *What happens
   * inside one function* runs **down**: its execution steps under the card they
   * are part of, an `if`/`else` forking into two arms side by side.
   *
   * One dagre pass cannot do both, because `rankdir` is a property of the whole
   * graph. So each function and its steps are laid out on their own, top to
   * bottom, and the results are laid out against each other left to right as
   * single boxes. Trying it in one pass is what produced the two arrangements
   * that were wrong in opposite ways: everything across put a function's own
   * steps in the columns beside it, and everything down turned a seven-deep
   * call stack into a ladder nobody could see the top and bottom of at once.
   */
  const trees = groupIntoTrees(automatic, diagram.edges)
  const local = new Map<string, { x: number; y: number }>()
  const extent = new Map<string, { width: number; height: number }>()

  for (const tree of trees) {
    const inner = run(
      "TB",
      tree.ids.map((id) => [id, size(tree.node(id))]),
      diagram.edges.filter(
        (edge) =>
          edge.kind === "child" && tree.has(edge.source) && tree.has(edge.target),
      ),
    )
    for (const [id, at] of inner.positions) local.set(id, at)
    extent.set(tree.root, inner.size)
  }

  // The trees against each other, each as one box the size of its own layout.
  const outer = run(
    "LR",
    trees.map(
      (tree) => [tree.root, extent.get(tree.root) ?? { width: 0, height: 0 }] as const,
    ),
    diagram.edges
      // A value handoff lays out across, exactly like a call — only its drawing
      // differs — so both drive the left→right pass.
      .filter((edge) => edge.kind === "call" || edge.kind === "value")
      .map((edge) => ({
        source: rootOf(trees, edge.source),
        target: rootOf(trees, edge.target),
      }))
      // A call inside one function does not move anything; it is only drawn.
      .filter((edge) => edge.source !== edge.target && edge.source !== "" && edge.target !== ""),
  )

  for (const tree of trees) {
    // Both passes hand back corners, so the tree's own layout only shifts.
    const at = outer.positions.get(tree.root) ?? { x: 0, y: 0 }
    const originX = at.x
    const originY = at.y
    for (const id of tree.ids) {
      const node = tree.node(id)
      const inner = local.get(id) ?? { x: 0, y: 0 }
      placed.set(id, {
        id,
        x: originX + inner.x,
        y: originY + inner.y,
        ...size(node),
      })
    }
  }

  return placed
}

/** One dagre pass, in either direction, over boxes that are already sized. */
function run(
  rankdir: "TB" | "LR",
  boxes: readonly (readonly [string, { width: number; height: number }])[],
  edges: readonly { source: string; target: string }[],
): {
  positions: Map<string, { x: number; y: number }>
  size: { width: number; height: number }
} {
  const graph = new dagre.graphlib.Graph()
  graph.setGraph({
    rankdir,
    nodesep: NODE_SEPARATION,
    ranksep: RANK_SEPARATION,
    edgesep: EDGE_SEPARATION,
    marginx: 16,
    marginy: 16,
  })
  graph.setDefaultEdgeLabel(() => ({}))
  for (const [id, box] of boxes) graph.setNode(id, { ...box })
  for (const edge of edges) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target)
    }
  }
  dagre.layout(graph)

  /*
   * Corner coordinates, measured from the content rather than from the origin.
   *
   * The result is handed back as a box for the outer pass to place, so the box
   * has to be exactly what is in it. Measuring from zero instead left the graph
   * margin inside the box at one end and outside it at the other, and two trees
   * on the same rank then overlapped by the difference: cards a few pixels into
   * each other, on a board whose whole job is to keep them apart.
   */
  const corners = new Map<string, { x: number; y: number }>()
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [id, box] of boxes) {
    const laid = graph.node(id) as { x: number; y: number } | undefined
    const x = (laid?.x ?? 0) - box.width / 2
    const y = (laid?.y ?? 0) - box.height / 2
    corners.set(id, { x, y })
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + box.width)
    maxY = Math.max(maxY, y + box.height)
  }
  if (corners.size === 0) return { positions: corners, size: { width: 0, height: 0 } }

  const positions = new Map<string, { x: number; y: number }>()
  for (const [id, at] of corners) positions.set(id, { x: at.x - minX, y: at.y - minY })
  return { positions, size: { width: maxX - minX, height: maxY - minY } }
}

/** A function and the steps nested inside it, which lay out together. */
type Tree = {
  root: string
  ids: string[]
  has: (id: string) => boolean
  node: (id: string) => DiagramNode
}

/**
 * Splits the nodes into the trees the `children` nesting describes.
 *
 * A node with no `child` edge into it is a root, and everything reachable from
 * it through `child` edges belongs to it. A cycle in the nesting cannot happen
 * — the tree came from nested JSON — but a node whose parent was hand-placed
 * can, and it becomes its own root rather than disappearing.
 */
function groupIntoTrees(
  automatic: readonly DiagramNode[],
  edges: readonly { source: string; target: string; kind: EdgeKind }[],
): Tree[] {
  const byId = new Map(automatic.map((node) => [node.id, node]))
  const childrenOf = new Map<string, string[]>()
  const hasParent = new Set<string>()
  for (const edge of edges) {
    if (edge.kind !== "child") continue
    if (!byId.has(edge.source) || !byId.has(edge.target)) continue
    childrenOf.set(edge.source, [...(childrenOf.get(edge.source) ?? []), edge.target])
    hasParent.add(edge.target)
  }

  const trees: Tree[] = []
  for (const node of automatic) {
    if (hasParent.has(node.id)) continue
    const ids: string[] = []
    const seen = new Set<string>()
    const collect = (id: string) => {
      if (seen.has(id)) return
      seen.add(id)
      ids.push(id)
      for (const child of childrenOf.get(id) ?? []) collect(child)
    }
    collect(node.id)
    trees.push({
      root: node.id,
      ids,
      has: (id) => seen.has(id),
      node: (id) => byId.get(id) ?? node,
    })
  }
  return trees
}

/** The tree a node belongs to, named by its root. */
function rootOf(trees: readonly Tree[], id: string): string {
  return trees.find((tree) => tree.has(id))?.root ?? ""
}


/** The box every placed node fits inside, in flow coordinates. */
export type Bounds = { x: number; y: number; width: number; height: number }

/**
 * The extent of a laid-out diagram.
 *
 * Computed from the layout rather than asked of the board through
 * `useReactFlow().getNodes()`. Both work; this one is exact, needs no board to
 * exist yet, and can be tested without rendering anything.
 */
export function bounds(placed: ReadonlyMap<string, Placed>): Bounds | null {
  if (placed.size === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of placed.values()) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x + node.width)
    maxY = Math.max(maxY, node.y + node.height)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}
