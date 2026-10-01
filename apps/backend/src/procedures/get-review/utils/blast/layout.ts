import type { Point } from "@/procedures/get-review/utils/journey/layout"
import type { Blast, BlastEdge, BlastNode } from "@/procedures/get-review/utils/review-artifact"

const NODE_SIZE = { width: 240, height: 64 } as const
const BOARD_MARGIN = 24
const ZONE_HEADER_HEIGHT = 36
const FILE_HEADER_HEIGHT = 28
const FILE_PADDING = 8
const NODE_GAP = 8
const FILE_GAP = 20
const COLUMN_GAP = 96
const HALF = 2
const BOTH_SIDES = 2
const COLUMN_WIDTH = NODE_SIZE.width + FILE_PADDING * BOTH_SIDES

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PlacedBlastNode extends Box {
  readonly node: BlastNode
}

export interface PlacedFile extends Box {
  readonly id: string
  readonly path: string
}

export interface PlacedZone {
  readonly ring: number
  readonly x: number
  readonly width: number
}

export interface PlacedBlastEdge {
  readonly edge: BlastEdge
  readonly route: "across" | "within"
  readonly points: readonly Point[]
}

export interface BlastLayout {
  readonly width: number
  readonly height: number
  readonly zones: readonly PlacedZone[]
  readonly files: readonly PlacedFile[]
  readonly nodes: readonly PlacedBlastNode[]
  readonly edges: readonly PlacedBlastEdge[]
}

interface Column {
  readonly files: readonly PlacedFile[]
  readonly nodes: readonly PlacedBlastNode[]
  readonly bottom: number
}

const fileHeightOf = (nodeCount: number): number =>
  FILE_HEADER_HEIGHT + nodeCount * NODE_SIZE.height + (nodeCount - 1) * NODE_GAP + FILE_PADDING

const placeFile = (column: Column, ring: number, x: number, path: string, nodes: readonly BlastNode[]): Column => {
  const file: PlacedFile = {
    id: `${String(ring)}:${path}`,
    path,
    x,
    y: column.bottom,
    width: COLUMN_WIDTH,
    height: fileHeightOf(nodes.length),
  }
  return {
    files: [...column.files, file],
    nodes: [
      ...column.nodes,
      ...nodes.map((node, position) => ({
        node,
        x: x + FILE_PADDING,
        y: file.y + FILE_HEADER_HEIGHT + position * (NODE_SIZE.height + NODE_GAP),
        ...NODE_SIZE,
      })),
    ],
    bottom: file.y + file.height + FILE_GAP,
  }
}

const layoutColumn = (nodes: readonly BlastNode[], ring: number, x: number): Column =>
  [...new Set(nodes.map((node) => node.path))]
    .sort((first, second) => first.localeCompare(second))
    .reduce<Column>(
      (column, path) => placeFile(column, ring, x, path, nodes.filter((node) => node.path === path)),
      { files: [], nodes: [], bottom: BOARD_MARGIN + ZONE_HEADER_HEIGHT },
    )

const middleOf = (box: Box): number => Math.round(box.y + box.height / HALF)

type Side = "left" | "right"

interface EdgeEnds {
  readonly edge: BlastEdge
  readonly route: PlacedBlastEdge["route"]
  readonly dependency: PlacedBlastNode
  readonly dependent: PlacedBlastNode
  readonly dependencySide: Side
  readonly dependentSide: Side
}

interface Port {
  readonly edge: BlastEdge
  readonly nodeId: string
  readonly side: Side
  readonly oppositeY: number
}

const endsOf = (edge: BlastEdge, nodes: readonly PlacedBlastNode[]): EdgeEnds | null => {
  const dependent = nodes.find((placed) => placed.node.id === edge.from)
  const dependency = nodes.find((placed) => placed.node.id === edge.to)
  if (dependent === undefined || dependency === undefined) return null
  if (dependent.node.ring === dependency.node.ring) {
    return { edge, route: "within", dependency, dependent, dependencySide: "right", dependentSide: "right" }
  }
  const isOutward = dependent.node.ring > dependency.node.ring
  return {
    edge,
    route: "across",
    dependency,
    dependent,
    dependencySide: isOutward ? "right" : "left",
    dependentSide: isOutward ? "left" : "right",
  }
}

const portsOf = (ends: EdgeEnds): Port[] => [
  { edge: ends.edge, nodeId: ends.dependency.node.id, side: ends.dependencySide, oppositeY: middleOf(ends.dependent) },
  { edge: ends.edge, nodeId: ends.dependent.node.id, side: ends.dependentSide, oppositeY: middleOf(ends.dependency) },
]

const portPoint = (ports: readonly Port[], placed: PlacedBlastNode, side: Side, edge: BlastEdge): Point => {
  const sharedPorts = ports
    .filter((port) => port.nodeId === placed.node.id && port.side === side)
    .sort((first, second) => first.oppositeY - second.oppositeY)
  const position = sharedPorts.findIndex((port) => port.edge === edge)
  return {
    x: side === "right" ? placed.x + placed.width : placed.x,
    y: Math.round(placed.y + (placed.height * (position + 1)) / (sharedPorts.length + 1)),
  }
}

const routeEdges = (edges: readonly BlastEdge[], nodes: readonly PlacedBlastNode[]): PlacedBlastEdge[] => {
  const allEnds = edges.map((edge) => endsOf(edge, nodes)).filter((ends) => ends !== null)
  const ports = allEnds.flatMap(portsOf)
  return allEnds.map((ends) => ({
    edge: ends.edge,
    route: ends.route,
    points: [
      portPoint(ports, ends.dependency, ends.dependencySide, ends.edge),
      portPoint(ports, ends.dependent, ends.dependentSide, ends.edge),
    ],
  }))
}

export const layoutBlast = (blast: Blast): BlastLayout => {
  const rings = [...new Set(blast.nodes.map((node) => node.ring))].sort((first, second) => first - second)
  const columns = rings.map((ring, position) =>
    layoutColumn(
      blast.nodes.filter((node) => node.ring === ring),
      ring,
      BOARD_MARGIN + position * (COLUMN_WIDTH + COLUMN_GAP),
    ))
  const nodes = columns.flatMap((column) => column.nodes)
  return {
    width: BOARD_MARGIN * BOTH_SIDES + rings.length * COLUMN_WIDTH + Math.max(0, rings.length - 1) * COLUMN_GAP,
    height: Math.max(BOARD_MARGIN + ZONE_HEADER_HEIGHT, ...columns.map((column) => column.bottom - FILE_GAP)) + BOARD_MARGIN,
    zones: rings.map((ring, position) => ({
      ring,
      x: BOARD_MARGIN + position * (COLUMN_WIDTH + COLUMN_GAP),
      width: COLUMN_WIDTH,
    })),
    files: columns.flatMap((column) => column.files),
    nodes,
    edges: routeEdges(blast.edges, nodes),
  }
}
