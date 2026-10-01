import dagre from "dagre"
import type { JourneyEdge, JourneyFlow, JourneyNode } from "@/procedures/get-review/utils/review-artifact"

export const DECLARATION_NODE_SIZE = { width: 264, height: 92 } as const
export const ENTRY_POINT_NODE_SIZE = { width: 264, height: 52 } as const
const EDGE_LABEL_SIZE = { width: 112, height: 20 } as const
const NO_EDGE_LABEL_SIZE = { width: 0, height: 0 } as const
const NODE_GAP = 40
const RANK_GAP = 56
const BOARD_MARGIN = 24
const HALF = 2

interface RoutedEdge {
  readonly points: readonly Point[]
  readonly x?: number
  readonly y?: number
}

export interface Point {
  readonly x: number
  readonly y: number
}

export interface PlacedNode {
  readonly node: JourneyNode
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PlacedEdge {
  readonly edge: JourneyEdge
  readonly points: readonly Point[]
  readonly labelPoint: Point
}

export interface JourneyLayout {
  readonly width: number
  readonly height: number
  readonly nodes: readonly PlacedNode[]
  readonly edges: readonly PlacedEdge[]
}

const sizeOf = (node: JourneyNode): { readonly width: number, readonly height: number } =>
  node.kind === "entry-point" ? ENTRY_POINT_NODE_SIZE : DECLARATION_NODE_SIZE

const edgeIdOf = (edge: JourneyEdge): string => `${edge.from}>${edge.to}:${edge.kind}`

const toPoint = ({ x, y }: Point): Point => ({ x: Math.round(x), y: Math.round(y) })

export const hasEdgeLabel = (edge: JourneyEdge): boolean =>
  edge.certainty === "assumed" || edge.kind === "value" || edge.kind === "data"

export const layoutJourney = (flow: JourneyFlow): JourneyLayout => {
  const graph = new dagre.graphlib.Graph({ multigraph: true })
  graph.setGraph({ rankdir: "TB", nodesep: NODE_GAP, ranksep: RANK_GAP, marginx: BOARD_MARGIN, marginy: BOARD_MARGIN })
  flow.nodes.forEach((node) => {
    graph.setNode(node.id, { ...sizeOf(node) })
  })
  flow.edges.forEach((edge) => {
    graph.setEdge(
      edge.from,
      edge.to,
      { ...(hasEdgeLabel(edge) ? EDGE_LABEL_SIZE : NO_EDGE_LABEL_SIZE), labelpos: "c" },
      edgeIdOf(edge),
    )
  })
  dagre.layout(graph)
  const { width = 0, height = 0 } = graph.graph()
  return {
    width: Math.round(width),
    height: Math.round(height),
    nodes: flow.nodes.map((node) => {
      const placed = graph.node(node.id)
      return {
        node,
        x: Math.round(placed.x - placed.width / HALF),
        y: Math.round(placed.y - placed.height / HALF),
        width: placed.width,
        height: placed.height,
      }
    }),
    edges: flow.edges.map((edge) => {
      const placed: RoutedEdge = graph.edge({ v: edge.from, w: edge.to, name: edgeIdOf(edge) })
      return {
        edge,
        points: placed.points.map(toPoint),
        labelPoint: toPoint({ x: placed.x ?? 0, y: placed.y ?? 0 }),
      }
    }),
  }
}
