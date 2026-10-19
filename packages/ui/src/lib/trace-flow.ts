import type { Point } from "@/lib/diagram-path"
import type { TraceLayout, LayoutNode, PlacedEdge, PlacedNode, PlacedRow } from "@/lib/trace-layout"

export type FlowHandleType = "source" | "target"

export interface FlowHandle extends Point {
  readonly id: string
  readonly type: FlowHandleType
}

export interface FlowFrame {
  readonly id: string
  readonly parentId: string | null
  readonly depth: number
  readonly position: Point
  readonly width: number
  readonly height: number
  readonly rows: readonly PlacedRow[]
  readonly handles: readonly FlowHandle[]
}

export interface FlowLine {
  readonly id: string
  readonly edgeId: string
  readonly source: string
  readonly target: string
  readonly sourceHandleId: string
  readonly targetHandleId: string
  readonly bends: readonly Point[]
  readonly hasArrow: boolean
  readonly isAboveNodes: boolean
}

export interface TraceFlow {
  readonly frames: readonly FlowFrame[]
  readonly lines: readonly FlowLine[]
}

interface LinePart {
  readonly id: string
  readonly edgeId: string
  readonly source: string
  readonly target: string
  readonly points: readonly Point[]
  readonly hasArrow: boolean
  readonly isAboveNodes: boolean
}

const ORIGIN: Point = { x: 0, y: 0 }

const parentIdsOf = (nodes: readonly LayoutNode[]): (readonly [string, string])[] =>
  nodes.flatMap((node) => [...node.children.map((child) => [child.id, node.id] as const), ...parentIdsOf(node.children)])

const relativeTo = <Placed extends Point>(placed: Placed, origin: Point): Placed => ({ ...placed, x: placed.x - origin.x, y: placed.y - origin.y })

const handleIdOf = (lineId: string, type: FlowHandleType): string => `${lineId}:${type}`

const partsOf = ({ id, from, to, points, fromRowPoints, toRowPoints }: PlacedEdge): LinePart[] => [
  { id, edgeId: id, source: from, target: to, points, hasArrow: toRowPoints === null, isAboveNodes: false },
  ...(fromRowPoints === null ? [] : [{ id: `${id}:from-row`, edgeId: id, source: from, target: from, points: fromRowPoints, hasArrow: false, isAboveNodes: true }]),
  ...(toRowPoints === null ? [] : [{ id: `${id}:to-row`, edgeId: id, source: to, target: to, points: toRowPoints, hasArrow: true, isAboveNodes: true }]),
]

const partsUnderNodesFirst = (edges: readonly PlacedEdge[]): LinePart[] => {
  const parts = edges.flatMap(partsOf)
  return [...parts.filter((part) => !part.isAboveNodes), ...parts.filter((part) => part.isAboveNodes)]
}

const handlesOf = (placed: PlacedNode, parts: readonly LinePart[]): FlowHandle[] =>
  parts.flatMap(({ id, source, target, points }) => [
    ...(source === placed.id ? [{ id: handleIdOf(id, "source"), type: "source" as const, ...relativeTo(points[0], placed) }] : []),
    ...(target === placed.id ? [{ id: handleIdOf(id, "target"), type: "target" as const, ...relativeTo(points[points.length - 1], placed) }] : []),
  ])

const toLine = ({ id, edgeId, source, target, points, hasArrow, isAboveNodes }: LinePart): FlowLine => ({
  id,
  edgeId,
  source,
  target,
  sourceHandleId: handleIdOf(id, "source"),
  targetHandleId: handleIdOf(id, "target"),
  bends: points.slice(1, -1),
  hasArrow,
  isAboveNodes,
})

export const toTraceFlow = (nodes: readonly LayoutNode[], layout: TraceLayout): TraceFlow => {
  const parentIdById = new Map(parentIdsOf(nodes))
  const placedById = new Map(layout.nodes.map((placed) => [placed.id, placed] as const))
  const parts = partsUnderNodesFirst(layout.edges)
  return {
    frames: layout.nodes.map((placed) => {
      const parentId = parentIdById.get(placed.id) ?? null
      const parent = parentId === null ? undefined : placedById.get(parentId)
      return {
        id: placed.id,
        parentId: parent === undefined ? null : parent.id,
        depth: placed.depth,
        position: relativeTo({ x: placed.x, y: placed.y }, parent ?? ORIGIN),
        width: placed.width,
        height: placed.height,
        rows: layout.rows.filter((row) => row.nodeId === placed.id).map((row) => relativeTo(row, placed)),
        handles: handlesOf(placed, parts),
      }
    }),
    lines: parts.map(toLine),
  }
}
