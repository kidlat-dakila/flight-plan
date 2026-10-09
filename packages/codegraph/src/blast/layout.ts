import type { Point } from "@/journey/layout"
import type { Blast, BlastEdge, BlastNode } from "@flightplan/configurations"

const LINK_LENGTH = 68
const LINK_PULL = 0.06
const RING_PULL = 3
const RING_GAP = 52
const RING_ARC_PER_FILE = 30
const FULL_TURN = 6.283185307179586
const START_SPREAD = 6
const GOLDEN_ANGLE = 2.399963229728653
const MAX_STEP_COUNT = 300
const MIN_STEP_COUNT = 24
const PAIR_BUDGET = 6_000_000
const START_TEMPERATURE = LINK_LENGTH
const MIN_DISTANCE = 0.01
const HORIZONTAL_STRETCH = 1.35
const MIN_RADIUS = 5
const RADIUS_PER_CONNECTION_ROOT = 1.6
const MAX_RADIUS = 14
const LABEL_CHARACTER_WIDTH = 6.7
const LABEL_HEIGHT = 34
const LABEL_GAP = 12
const SEPARATION_PASS_COUNT = 40
const BOARD_MARGIN = 32
const ARROW_GAP = 6
const HALF = 2
const BOTH_SIDES = 2

export interface PlacedBlastNode extends Point {
  readonly node: BlastNode
  readonly radius: number
}

export interface PlacedBlastEdge {
  readonly edge: BlastEdge
  readonly points: readonly [Point, Point]
}

export interface BlastLayout {
  readonly width: number
  readonly height: number
  readonly nodes: readonly PlacedBlastNode[]
  readonly edges: readonly PlacedBlastEdge[]
}

interface Footprint {
  readonly halfWidth: number
  readonly top: number
  readonly bottom: number
}

const ORIGIN: Point = { x: 0, y: 0 }

const plus = (one: Point, two: Point): Point => ({ x: one.x + two.x, y: one.y + two.y })

const scaled = (point: Point, factor: number): Point => ({ x: point.x * factor, y: point.y * factor })

const offsetBetween = (from: Point, to: Point): Point => ({ x: to.x - from.x, y: to.y - from.y })

const lengthOf = ({ x, y }: Point): number => Math.max(MIN_DISTANCE, Math.hypot(x, y))

const startPoint = (position: number, ringRadius: number): Point => {
  const distance = ringRadius + START_SPREAD * Math.sqrt(position + 1)
  const angle = position * GOLDEN_ANGLE
  return { x: distance * Math.cos(angle), y: distance * Math.sin(angle) }
}

const pushFrom = (point: Point, other: Point): Point => {
  const away = offsetBetween(other, point)
  const distance = lengthOf(away)
  return scaled(away, LINK_LENGTH ** HALF / distance ** HALF)
}

const pullTo = (point: Point, linked: Point): Point => {
  const toward = offsetBetween(point, linked)
  return scaled(toward, (LINK_PULL * lengthOf(toward)) / LINK_LENGTH)
}

const pullToRing = (point: Point, ringRadius: number): Point => {
  const distance = lengthOf(point)
  return scaled(point, (RING_PULL * (ringRadius - distance)) / distance)
}

const forceOn = (position: number, points: readonly Point[], linkedPositions: readonly number[], ringRadius: number): Point => {
  const point = points[position]
  const push = points.reduce((force, other, otherPosition) => (otherPosition === position ? force : plus(force, pushFrom(point, other))), ORIGIN)
  const pull = linkedPositions.reduce((force, linkedPosition) => plus(force, pullTo(point, points[linkedPosition])), ORIGIN)
  return plus(plus(push, pull), pullToRing(point, ringRadius))
}

const moved = (point: Point, force: Point, temperature: number): Point => {
  const strength = lengthOf(force)
  return plus(point, scaled(force, Math.min(strength, temperature) / strength))
}

const stepCountFor = (nodeCount: number): number =>
  Math.max(MIN_STEP_COUNT, Math.min(MAX_STEP_COUNT, Math.floor(PAIR_BUDGET / Math.max(1, nodeCount ** HALF))))

const settle = (points: readonly Point[], links: readonly (readonly number[])[], ringRadii: readonly number[]): readonly Point[] => {
  const stepCount = stepCountFor(points.length)
  return Array.from({ length: stepCount }, (_step, step) => START_TEMPERATURE * (1 - step / stepCount)).reduce<readonly Point[]>(
    (placed, temperature) => placed.map((point, position) => moved(point, forceOn(position, placed, links[position], ringRadii[position]), temperature)),
    points,
  )
}

const radiusOf = (connectionCount: number): number =>
  Math.min(MAX_RADIUS, Math.round(MIN_RADIUS + RADIUS_PER_CONNECTION_ROOT * Math.sqrt(connectionCount)))

const footprintOf = (radius: number, label: string): Footprint => ({
  halfWidth: Math.max(radius, (label.length * LABEL_CHARACTER_WIDTH) / HALF) + LABEL_GAP / HALF,
  top: radius + LABEL_GAP / HALF,
  bottom: radius + LABEL_HEIGHT + LABEL_GAP / HALF,
})

const shoveFrom = (point: Point, footprint: Footprint, other: Point, otherFootprint: Footprint): Point => {
  const overlapX = footprint.halfWidth + otherFootprint.halfWidth - Math.abs(point.x - other.x)
  const isBelow = point.y >= other.y
  const overlapY = (isBelow ? otherFootprint.bottom + footprint.top : footprint.bottom + otherFootprint.top) - Math.abs(point.y - other.y)
  if (overlapX <= 0 || overlapY <= 0) return ORIGIN
  return overlapX < overlapY
    ? { x: (point.x >= other.x ? overlapX : -overlapX) / HALF, y: 0 }
    : { x: 0, y: (isBelow ? overlapY : -overlapY) / HALF }
}

const separate = (points: readonly Point[], footprints: readonly Footprint[]): readonly Point[] =>
  Array.from({ length: SEPARATION_PASS_COUNT }).reduce<readonly Point[]>(
    (placed) =>
      placed.map((point, position) =>
        plus(
          point,
          placed.reduce(
            (shove, other, otherPosition) =>
              otherPosition === position ? shove : plus(shove, shoveFrom(point, footprints[position], other, footprints[otherPosition])),
            ORIGIN,
          ),
        )),
    points,
  )

const endOnRim = (centre: Point, toward: Point, radius: number): Point => {
  const direction = offsetBetween(centre, toward)
  const reach = (radius + ARROW_GAP) / lengthOf(direction)
  return { x: Math.round(centre.x + direction.x * reach), y: Math.round(centre.y + direction.y * reach) }
}

const placeEdge = (edge: BlastEdge, nodeByPath: ReadonlyMap<string, PlacedBlastNode>): PlacedBlastEdge[] => {
  const importer = nodeByPath.get(edge.importer)
  const imported = nodeByPath.get(edge.imported)
  if (importer === undefined || imported === undefined) return []
  return [{ edge, points: [endOnRim(importer, imported, importer.radius), endOnRim(imported, importer, imported.radius)] }]
}

const linkedPathOf = (edge: BlastEdge, path: string): string | null => {
  if (edge.importer === path) return edge.imported
  return edge.imported === path ? edge.importer : null
}

const linkedPositionsOf = (blast: Blast): number[][] => {
  const positionByPath = new Map(blast.nodes.map((node, position) => [node.path, position] as const))
  return blast.nodes.map(({ path }) =>
    blast.edges.flatMap((edge) => {
      const linkedPosition = positionByPath.get(linkedPathOf(edge, path) ?? "")
      return linkedPosition === undefined ? [] : [linkedPosition]
    }))
}

const isChanged = (node: BlastNode): boolean => node.diffType !== null

const changedDepthOf = (blast: Blast, changedPaths: ReadonlySet<string>, path: string, visited: ReadonlySet<string>): number => {
  const importedChanged = blast.edges
    .filter((edge) => edge.importer === path && changedPaths.has(edge.imported) && !visited.has(edge.imported))
    .map((edge) => edge.imported)
  const within = new Set([...visited, path])
  return importedChanged.reduce((depth, imported) => Math.max(depth, 1 + changedDepthOf(blast, changedPaths, imported, within)), 0)
}

const expandDistances = (blast: Blast, frontier: readonly string[], distances: ReadonlyMap<string, number>, distance: number): ReadonlyMap<string, number> => {
  const next = [...new Set(blast.edges.flatMap((edge) => {
    if (frontier.includes(edge.imported)) return [edge.importer]
    return frontier.includes(edge.importer) ? [edge.imported] : []
  }))].filter((path) => !distances.has(path))
  return next.length === 0
    ? distances
    : expandDistances(blast, next, new Map([...distances, ...next.map((path) => [path, distance] as const)]), distance + 1)
}

const ringOrdersOf = (blast: Blast): number[] => {
  const changedPaths = new Set(blast.nodes.filter(isChanged).map((node) => node.path))
  const depths = new Map([...changedPaths].map((path) => [path, changedDepthOf(blast, changedPaths, path, new Set())] as const))
  const deepestChange = Math.max(0, ...depths.values())
  const distances = expandDistances(blast, [...changedPaths], new Map([...changedPaths].map((path) => [path, 0] as const)), 1)
  const furthest = Math.max(0, ...distances.values())
  return blast.nodes.map((node) => depths.get(node.path) ?? deepestChange + (distances.get(node.path) ?? furthest + 1))
}

const addRingRadius = (radii: ReadonlyMap<number, number>, order: number, fileCount: number): ReadonlyMap<number, number> => {
  const fitting = fileCount === 1 && radii.size === 0 ? 0 : (fileCount * RING_ARC_PER_FILE) / FULL_TURN
  const inner = radii.size === 0 ? fitting : Math.max(...radii.values()) + RING_GAP
  return new Map([...radii, [order, Math.max(fitting, inner)]])
}

const ringRadiiOf = (ringOrders: readonly number[]): number[] => {
  const orders = [...new Set(ringOrders)].sort((one, two) => one - two)
  const radiusByOrder = orders.reduce<ReadonlyMap<number, number>>(
    (radii, order) => addRingRadius(radii, order, ringOrders.filter((candidate) => candidate === order).length),
    new Map(),
  )
  return ringOrders.map((order) => radiusByOrder.get(order) ?? 0)
}

const highestOf = (values: readonly number[]): number => (values.length === 0 ? 0 : Math.max(...values))

export const layoutBlast = (blast: Blast, labelByPath: ReadonlyMap<string, string>): BlastLayout => {
  const links = linkedPositionsOf(blast)
  const radii = links.map((linked) => radiusOf(linked.length))
  const footprints = blast.nodes.map((node, position) => footprintOf(radii[position], labelByPath.get(node.path) ?? node.path))
  const ringRadii = ringRadiiOf(ringOrdersOf(blast))
  const settled = settle(blast.nodes.map((_node, position) => startPoint(position, ringRadii[position])), links, ringRadii)
  const spread = separate(settled.map((point) => ({ x: point.x * HORIZONTAL_STRETCH, y: point.y })), footprints)
  const halfWidth = highestOf(spread.map((point, position) => Math.abs(point.x) + footprints[position].halfWidth)) + BOARD_MARGIN
  const halfHeight = highestOf(spread.map((point, position) => Math.abs(point.y) + footprints[position].bottom)) + BOARD_MARGIN
  const nodes = blast.nodes.map((node, position) => ({
    node,
    radius: radii[position],
    x: Math.round(spread[position].x + halfWidth),
    y: Math.round(spread[position].y + halfHeight),
  }))
  const nodeByPath = new Map(nodes.map((placed) => [placed.node.path, placed] as const))
  return {
    width: Math.round(halfWidth * BOTH_SIDES),
    height: Math.round(halfHeight * BOTH_SIDES),
    nodes,
    edges: blast.edges.flatMap((edge) => placeEdge(edge, nodeByPath)),
  }
}
