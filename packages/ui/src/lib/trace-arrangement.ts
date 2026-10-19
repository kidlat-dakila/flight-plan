import type { Point } from "@/lib/diagram-path"
import { COLUMN_GAP, EDGE_APPROACH, MARGIN, NODE_GAP, type TraceLayout, type PlacedEdge, type PlacedNode } from "@/lib/trace-layout"

export type CardSide = "left" | "top" | "bottom"

export type PositionById = ReadonlyMap<string, Point>

export type SideByEdgeId = ReadonlyMap<string, CardSide>

interface Stack {
  readonly bottom: number
  readonly positions: readonly (readonly [string, Point])[]
}

const HALF = 2
const NO_SHIFT: Point = { x: 0, y: 0 }
const DEFAULT_SIDE: CardSide = "left"

const isUnshifted = ({ x, y }: Point): boolean => x === 0 && y === 0

const shifted = <Placed extends Point>(placed: Placed, shift: Point): Placed => ({ ...placed, x: placed.x + shift.x, y: placed.y + shift.y })

const stackBeside = (unplaced: readonly PlacedNode[], placed: readonly PlacedNode[], positionById: PositionById): PositionById => {
  const rights = placed.map((node) => (positionById.get(node.id)?.x ?? node.x) + node.width)
  const x = Math.max(...rights) + COLUMN_GAP
  const tops = placed.map((node) => positionById.get(node.id)?.y ?? node.y)
  const stack = unplaced.reduce<Stack>(
    ({ bottom, positions }, node) => ({ bottom: bottom + node.height + NODE_GAP, positions: [...positions, [node.id, { x, y: bottom }] as const] }),
    { bottom: Math.max(MARGIN, Math.min(...tops)), positions: [] },
  )
  return new Map(stack.positions)
}

export const nearestSideOf = (point: Point, { x, y, width, height }: Point & { readonly width: number, readonly height: number }): CardSide => {
  const distances: readonly (readonly [CardSide, number])[] = [
    ["left", Math.abs(point.x - x)],
    ["top", Math.abs(point.y - y)],
    ["bottom", Math.abs(point.y - (y + height))],
  ]
  const isRightOfMiddle = point.x > x + width / HALF
  const [nearest] = [...distances].filter(([side]) => side !== "left" || !isRightOfMiddle).sort(([, one], [, two]) => one - two)
  return nearest[0]
}

export const placeUnplacedCards = (layout: TraceLayout, positionById: PositionById): PositionById => {
  const tops = layout.nodes.filter((node) => node.depth === 0)
  const placed = tops.filter((node) => positionById.has(node.id))
  const unplaced = tops.filter((node) => !positionById.has(node.id))
  if (placed.length === 0 || unplaced.length === 0) return positionById
  return new Map([...positionById, ...stackBeside(unplaced, placed, positionById)])
}

const endAtSide = (target: PlacedNode, side: Exclude<CardSide, "left">): readonly [Point, Point] => {
  const x = target.x + target.width / HALF
  return side === "top"
    ? [{ x, y: target.y - EDGE_APPROACH }, { x, y: target.y }]
    : [{ x, y: target.y + target.height + EDGE_APPROACH }, { x, y: target.y + target.height }]
}

const rerouteEdge = (edge: PlacedEdge, fromShift: Point, toShift: Point, side: CardSide, target: PlacedNode | undefined): PlacedEdge => {
  const start = shifted(edge.points[0], fromShift)
  const fromRowPoints = edge.fromRowPoints === null ? null : edge.fromRowPoints.map((point) => shifted(point, fromShift))
  if (side !== DEFAULT_SIDE && target !== undefined) {
    return { ...edge, points: [start, ...endAtSide(target, side)], fromRowPoints, toRowPoints: null }
  }
  const end = shifted(edge.points[edge.points.length - 1], toShift)
  return {
    ...edge,
    points: [start, { x: end.x - EDGE_APPROACH, y: end.y }, end],
    fromRowPoints,
    toRowPoints: edge.toRowPoints === null ? null : edge.toRowPoints.map((point) => shifted(point, toShift)),
  }
}

export const arrangeTrace = (layout: TraceLayout, positionById: PositionById, sideByEdgeId: SideByEdgeId): TraceLayout => {
  const tops = layout.nodes.filter((node) => node.depth === 0)
  const shiftByTopId = new Map(
    tops.map((node) => {
      const position = positionById.get(node.id)
      return [node.id, position === undefined ? NO_SHIFT : { x: position.x - node.x, y: position.y - node.y }] as const
    }),
  )
  const shiftOfTop = (topId: string): Point => shiftByTopId.get(topId) ?? NO_SHIFT
  const nodes = layout.nodes.map((node) => shifted(node, shiftOfTop(node.topId)))
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const))
  const shiftOfNode = (nodeId: string): Point => shiftOfTop(nodeById.get(nodeId)?.topId ?? nodeId)
  const edges = layout.edges.map((edge) => {
    const fromShift = shiftOfNode(edge.from)
    const toShift = shiftOfNode(edge.to)
    const side = sideByEdgeId.get(edge.id) ?? DEFAULT_SIDE
    return isUnshifted(fromShift) && isUnshifted(toShift) && side === DEFAULT_SIDE ? edge : rerouteEdge(edge, fromShift, toShift, side, nodeById.get(edge.to))
  })
  return {
    width: Math.max(layout.width, ...nodes.map((node) => node.x + node.width + MARGIN)),
    height: Math.max(layout.height, ...nodes.map((node) => node.y + node.height + MARGIN)),
    nodes,
    rows: layout.rows.map((row) => shifted(row, shiftOfNode(row.nodeId))),
    edges,
  }
}
