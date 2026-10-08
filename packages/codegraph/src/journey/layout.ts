import dagre from "dagre"
import type { JourneyEdge, JourneyFlow, JourneyNode } from "@flightplan/configurations"
import { layoutUiCards, listCardPorts, type Box, type CardPort, type FrameLayout, type TriggerLayout } from "./ui-cards"

export const DECLARATION_NODE_SIZE = { width: 264, height: 92 } as const
export const ENTRY_POINT_NODE_SIZE = { width: 264, height: 52 } as const
const NODE_GAP = 40
const RANK_GAP = 56
const BOARD_MARGIN = 24
const HALF = 2

interface RoutedEdge {
  readonly points: readonly Point[]
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
  readonly isInsideCard: boolean
}

export interface PlacedEdge {
  readonly id: string
  readonly edge: JourneyEdge
  readonly points: readonly Point[]
  readonly isInsideCard: boolean
}

export interface PlacedCard extends Box {
  readonly id: string
  readonly frames: readonly FrameLayout[]
  readonly triggers: readonly TriggerLayout[]
}

export interface JourneyLayout {
  readonly width: number
  readonly height: number
  readonly nodes: readonly PlacedNode[]
  readonly cards: readonly PlacedCard[]
  readonly edges: readonly PlacedEdge[]
  readonly lineOutKeys: ReadonlySet<string>
  readonly lineInKeys: ReadonlySet<string>
}

interface Connection {
  readonly id: string
  readonly edge: JourneyEdge
  readonly fromId: string
  readonly toId: string
  readonly fromPort: CardPort | null
  readonly toPort: CardPort | null
}

type Ports = ReadonlyMap<string, readonly CardPort[]>

const NO_PORT: readonly (CardPort | null)[] = [null]
const OCCURRENCE_MARK = "#"

const sizeOf = (node: JourneyNode): { readonly width: number, readonly height: number } =>
  node.kind === "entry-point" ? ENTRY_POINT_NODE_SIZE : DECLARATION_NODE_SIZE

const edgeIdOf = (edge: JourneyEdge): string => `${edge.from}>${edge.to}:${edge.kind}`

const toPoint = ({ x, y }: Point): Point => ({ x: Math.round(x), y: Math.round(y) })

const leavingPortsOf = (ports: Ports, { from, to }: JourneyEdge): readonly (CardPort | null)[] => {
  const held = ports.get(from)
  if (held === undefined) return NO_PORT
  const leadingThere = held.filter((port) => port.onlyToId === to)
  return leadingThere.length > 0 ? leadingThere : held
}

const arrivingPortsOf = (ports: Ports, { to }: JourneyEdge): readonly (CardPort | null)[] => ports.get(to) ?? NO_PORT

const isInsideCard = (ports: Ports, { from, to }: JourneyEdge): boolean => ports.has(from) && ports.has(to)

const occurrenceIdOf = (edge: JourneyEdge, position: number): string =>
  position === 0 ? edgeIdOf(edge) : `${edgeIdOf(edge)}${OCCURRENCE_MARK}${String(position)}`

const connectionsOf = (ports: Ports, edge: JourneyEdge): Connection[] =>
  isInsideCard(ports, edge)
    ? []
    : leavingPortsOf(ports, edge)
        .flatMap((fromPort) => arrivingPortsOf(ports, edge).map((toPort) => ({ fromPort, toPort })))
        .map(({ fromPort, toPort }, position) => ({
          id: occurrenceIdOf(edge, position),
          edge,
          fromId: fromPort?.cardId ?? edge.from,
          toId: toPort?.cardId ?? edge.to,
          fromPort,
          toPort,
        }))

const movedBy = <Placed extends Box>(placed: Placed, { x, y }: Point): Placed => ({ ...placed, x: placed.x + x, y: placed.y + y })

const leavingPointOf = (port: CardPort, card: Box): Point => ({ x: card.x + card.width, y: card.y + port.y })

const arrivingPointOf = (port: CardPort, card: Box): Point => ({ x: card.x, y: card.y + port.y })

const routeThroughPorts = (points: readonly Point[], { fromPort, toPort }: Connection, cardAt: (cardId: string) => Box): Point[] => {
  const start = fromPort === null ? points.slice(0, 1) : [leavingPointOf(fromPort, cardAt(fromPort.cardId))]
  const end = toPort === null ? points.slice(-1) : [arrivingPointOf(toPort, cardAt(toPort.cardId))]
  return [...start, ...points.slice(1, -1), ...end]
}

const boxOnly = ({ x, y, width, height }: Box): Box => ({ x, y, width, height })

const keysOf = (ports: readonly (CardPort | null)[]): string[] => ports.flatMap((port) => (port === null ? [] : [port.key]))

export const layoutJourney = (flow: JourneyFlow): JourneyLayout => {
  const cards = layoutUiCards(flow)
  const ports = listCardPorts(cards)
  const connections = flow.edges.flatMap((edge) => connectionsOf(ports, edge))
  const graph = new dagre.graphlib.Graph({ multigraph: true })
  graph.setGraph({ rankdir: "LR", nodesep: NODE_GAP, ranksep: RANK_GAP, marginx: BOARD_MARGIN, marginy: BOARD_MARGIN })
  flow.nodes.filter((node) => !ports.has(node.id)).forEach((node) => {
    graph.setNode(node.id, { ...sizeOf(node) })
  })
  cards.forEach((card) => {
    graph.setNode(card.id, { width: card.width, height: card.height })
  })
  connections.forEach(({ id, fromId, toId }) => {
    graph.setEdge(fromId, toId, {}, id)
  })
  dagre.layout(graph)
  const { width = 0, height = 0 } = graph.graph()
  const boxOf = (id: string): Box => {
    const placed = graph.node(id)
    return { x: Math.round(placed.x - placed.width / HALF), y: Math.round(placed.y - placed.height / HALF), width: placed.width, height: placed.height }
  }
  const placedCards = cards.map((card): PlacedCard => {
    const box = boxOf(card.id)
    return {
      ...box,
      id: card.id,
      frames: card.frames.map((frame) => movedBy(frame, box)),
      triggers: card.triggers.map((trigger) => movedBy(trigger, box)),
    }
  })
  const insideBoxOf = (nodeId: string): Box | null => {
    const inside = placedCards.flatMap((card) => [
      ...card.frames.filter((frame) => frame.node?.id === nodeId),
      ...card.triggers.filter((trigger) => trigger.entryPoint.id === nodeId),
    ])
    return inside.length === 0 ? null : boxOnly(inside[0])
  }
  return {
    width: Math.round(width),
    height: Math.round(height),
    nodes: flow.nodes.map((node) => {
      const inside = insideBoxOf(node.id)
      return { node, ...(inside ?? boxOf(node.id)), isInsideCard: inside !== null }
    }),
    cards: placedCards,
    lineOutKeys: new Set(keysOf(connections.map((connection) => connection.fromPort))),
    lineInKeys: new Set(keysOf(connections.map((connection) => connection.toPort))),
    edges: [
      ...flow.edges.filter((edge) => isInsideCard(ports, edge)).map((edge): PlacedEdge => ({ id: edgeIdOf(edge), edge, points: [], isInsideCard: true })),
      ...connections.map((connection): PlacedEdge => {
        const placed: RoutedEdge = graph.edge({ v: connection.fromId, w: connection.toId, name: connection.id })
        return {
          id: connection.id,
          edge: connection.edge,
          points: routeThroughPorts(placed.points.map(toPoint), connection, boxOf),
          isInsideCard: false,
        }
      }),
    ],
  }
}
