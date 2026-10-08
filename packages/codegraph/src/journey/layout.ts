import type { JourneyEdge, JourneyFlow, JourneyNode } from "@flightplan/configurations"
import { layoutLayers, type LayerSpacing, type Point } from "./layered-layout"
import { layoutUiCards, listCardPorts, UI_CARD_HEADER_HEIGHT, type Box, type CardPort, type FrameLayout, type TriggerLayout, type UiCardLayout } from "./ui-cards"

export const DECLARATION_NODE_SIZE = { width: 264, height: 92 } as const
export const ENTRY_POINT_NODE_SIZE = { width: 264, height: 52 } as const
const SPACING: LayerSpacing = { itemGap: 40, laneGap: 20, columnGap: 72, widestColumnGap: 200, margin: 24 }
const NO_BOX: Box = { x: 0, y: 0, width: 0, height: 0 }

export type { Point } from "./layered-layout"

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

export interface PlacedCard extends Box, Pick<UiCardLayout, "id" | "declaration" | "path" | "headerNode"> {
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

const boxOnly = ({ x, y, width, height }: Box): Box => ({ x, y, width, height })

const keysOf = (ports: readonly (CardPort | null)[]): string[] => ports.flatMap((port) => (port === null ? [] : [port.key]))

export const layoutJourney = (flow: JourneyFlow): JourneyLayout => {
  const cards = layoutUiCards(flow)
  const ports = listCardPorts(cards)
  const connections = flow.edges.flatMap((edge) => connectionsOf(ports, edge))
  const layered = layoutLayers(
    [
      ...flow.nodes.filter((node) => !ports.has(node.id)).map((node) => ({ id: node.id, ...sizeOf(node) })),
      ...cards.map((card) => ({ id: card.id, width: card.width, height: card.height })),
    ],
    connections.map(({ id, fromId, toId, fromPort, toPort }) => ({ id, fromId, toId, fromOffsetY: fromPort?.y ?? null, toOffsetY: toPort?.y ?? null })),
    SPACING,
  )
  const boxOf = (id: string): Box => layered.boxes.get(id) ?? NO_BOX
  const placedCards = cards.map((card): PlacedCard => {
    const box = boxOf(card.id)
    return {
      ...box,
      id: card.id,
      declaration: card.declaration,
      path: card.path,
      headerNode: card.headerNode,
      frames: card.frames.map((frame) => movedBy(frame, box)),
      triggers: card.triggers.map((trigger) => movedBy(trigger, box)),
    }
  })
  const insideBoxOf = (nodeId: string): Box | null => {
    const inside = placedCards.flatMap((card): Box[] => [
      ...(card.headerNode?.id === nodeId ? [{ ...boxOnly(card), height: UI_CARD_HEADER_HEIGHT }] : []),
      ...card.frames.filter((frame) => frame.role !== "return" && frame.node?.id === nodeId),
      ...card.triggers.filter((trigger) => trigger.entryPoint.id === nodeId),
    ])
    return inside.length === 0 ? null : boxOnly(inside[0])
  }
  return {
    width: layered.width,
    height: layered.height,
    nodes: flow.nodes.map((node) => {
      const inside = insideBoxOf(node.id)
      return { node, ...(inside ?? boxOf(node.id)), isInsideCard: inside !== null }
    }),
    cards: placedCards,
    lineOutKeys: new Set(keysOf(connections.map((connection) => connection.fromPort))),
    lineInKeys: new Set(keysOf(connections.map((connection) => connection.toPort))),
    edges: [
      ...flow.edges.filter((edge) => isInsideCard(ports, edge)).map((edge): PlacedEdge => ({ id: edgeIdOf(edge), edge, points: [], isInsideCard: true })),
      ...connections.map((connection): PlacedEdge => ({
        id: connection.id,
        edge: connection.edge,
        points: layered.routes.get(connection.id) ?? [],
        isInsideCard: false,
      })),
    ],
  }
}
