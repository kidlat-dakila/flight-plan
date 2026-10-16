import type { Point } from "@/lib/diagram-path"

export type LayoutRowKind = "heading" | "row" | "two-line-row" | "card"

type DrawnRowKind = Exclude<LayoutRowKind, "card">

export interface LayoutRow {
  readonly id: string
  readonly kind: LayoutRowKind
}

export interface LayoutNode {
  readonly id: string
  readonly rows: readonly LayoutRow[]
  readonly children: readonly LayoutNode[]
}

export interface LayoutEdge {
  readonly id: string
  readonly from: string
  readonly to: string
  readonly fromRowId: string | null
  readonly toRowId: string | null
}

export interface Box {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export interface PlacedNode extends Box {
  readonly id: string
  readonly topId: string
  readonly depth: number
}

export interface PlacedRow extends Box {
  readonly id: string
  readonly kind: LayoutRowKind
  readonly nodeId: string
}

export interface PlacedEdge extends LayoutEdge {
  readonly points: readonly Point[]
  readonly fromRowPoints: readonly Point[] | null
  readonly toRowPoints: readonly Point[] | null
}

export interface JourneyLayout {
  readonly width: number
  readonly height: number
  readonly nodes: readonly PlacedNode[]
  readonly rows: readonly PlacedRow[]
  readonly edges: readonly PlacedEdge[]
}

interface Size {
  readonly width: number
  readonly height: number
}

interface Link {
  readonly edge: LayoutEdge
  readonly from: string
  readonly to: string
}

interface PlacedLane {
  readonly toId: string
  readonly column: number
  readonly x: number
  readonly width: number
  readonly y: number
  readonly edgeIds: readonly string[]
}

interface Placement {
  readonly nodes: readonly PlacedNode[]
  readonly rows: readonly PlacedRow[]
  readonly lanes: readonly PlacedLane[]
}

interface ColumnItem {
  readonly node: LayoutNode | null
  readonly toId: string
  readonly height: number
  readonly anchorHeight: number
  readonly edgeIds: readonly string[]
}

interface Stack {
  readonly bottom: number
  readonly placement: Placement
}

interface LoopSearch {
  readonly visitedIds: ReadonlySet<string>
  readonly closingLinks: readonly Link[]
}

interface Route {
  readonly link: Link
  readonly start: Point
  readonly lanePoints: readonly Point[]
  readonly end: Point
  readonly fromRow: PlacedRow | undefined
  readonly toRow: PlacedRow | undefined
}

type ColumnById = ReadonlyMap<string, number>

export const NODE_WIDTH = 264
export const NODE_HEAD_HEIGHT = 96
export const ROW_HEIGHT = 36
export const TWO_LINE_ROW_HEIGHT = 48
export const ROW_HEADING_HEIGHT = 16
export const EDGE_APPROACH = 24
export const EDGE_SPACING = 18
const ARRIVAL_INSET = 6
const ROW_GAP = 6
const INSET = 10
const BOTTOM_PADDING = 8
export const COLUMN_GAP = 96
export const NODE_GAP = 32
export const MARGIN = 24
const HALF = 2
const NOTHING_PLACED: Placement = { nodes: [], rows: [], lanes: [] }

const sumOf = (numbers: readonly number[]): number => numbers.reduce((total, one) => total + one, 0)

const ROW_HEIGHTS: Readonly<Record<DrawnRowKind, number>> = { "heading": ROW_HEADING_HEIGHT, "row": ROW_HEIGHT, "two-line-row": TWO_LINE_ROW_HEIGHT }
const CARD_ROW: LayoutRowKind = "card"

type LayoutPart = { readonly kind: "row", readonly row: LayoutRow & { readonly kind: DrawnRowKind } } | { readonly kind: "card", readonly node: LayoutNode }

interface PartsPlacement {
  readonly top: number
  readonly placed: Placement
}

const isDrawnRow = (row: LayoutRow): row is LayoutRow & { readonly kind: DrawnRowKind } => row.kind !== CARD_ROW

const partsOf = (node: LayoutNode): LayoutPart[] => {
  const childById = new Map(node.children.map((child) => [child.id, child] as const))
  const placedIds = new Set(node.rows.filter((row) => row.kind === CARD_ROW).map((row) => row.id))
  return [
    ...node.rows.flatMap((row): LayoutPart[] => {
      if (isDrawnRow(row)) return [{ kind: "row", row }]
      const child = childById.get(row.id)
      return child === undefined ? [] : [{ kind: "card", node: child }]
    }),
    ...node.children.filter((child) => !placedIds.has(child.id)).map((child): LayoutPart => ({ kind: "card", node: child })),
  ]
}

const heightOfPart = (part: LayoutPart): number => (part.kind === "row" ? ROW_HEIGHTS[part.row.kind] : sizeOf(part.node).height) + ROW_GAP

const sizeOf = (node: LayoutNode): Size => {
  const childSizes = node.children.map(sizeOf)
  return {
    width: Math.max(NODE_WIDTH, ...childSizes.map((size) => size.width + INSET * HALF)),
    height: NODE_HEAD_HEIGHT + sumOf(partsOf(node).map(heightOfPart)) + BOTTOM_PADDING,
  }
}

const placeNode = (node: LayoutNode, box: Omit<Box, "height">, depth: number, topId: string): Placement => {
  const { height } = sizeOf(node)
  const inner = { x: box.x + INSET, width: box.width - INSET * HALF }
  const placeOne = (part: LayoutPart, y: number): Placement =>
    part.kind === "row"
      ? { nodes: [], rows: [{ ...part.row, nodeId: node.id, ...inner, y, height: ROW_HEIGHTS[part.row.kind] }], lanes: [] }
      : placeNode(part.node, { ...inner, y }, depth + 1, topId)
  const { placed } = partsOf(node).reduce<PartsPlacement>(
    ({ top, placed: soFar }, part) => ({ top: top + heightOfPart(part), placed: mergePlacements([soFar, placeOne(part, top)]) }),
    { top: box.y + NODE_HEAD_HEIGHT, placed: NOTHING_PLACED },
  )
  return {
    nodes: [{ id: node.id, topId, depth, ...box, height }, ...placed.nodes],
    rows: placed.rows,
    lanes: [],
  }
}

const idsWithin = (node: LayoutNode): string[] => [node.id, ...node.children.flatMap(idsWithin)]

const mergePlacements = (placements: readonly Placement[]): Placement => ({
  nodes: placements.flatMap((placement) => placement.nodes),
  rows: placements.flatMap((placement) => placement.rows),
  lanes: placements.flatMap((placement) => placement.lanes),
})

const linksOf = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): Link[] => {
  const topIdById = new Map(nodes.flatMap((node) => idsWithin(node).map((id) => [id, node.id] as const)))
  return edges.flatMap((edge) => {
    const from = topIdById.get(edge.from)
    const to = topIdById.get(edge.to)
    return from === undefined || to === undefined || from === to ? [] : [{ edge, from, to }]
  })
}

const NOTHING_SEARCHED: LoopSearch = { visitedIds: new Set(), closingLinks: [] }

const searchLoops = (id: string, pathIds: readonly string[], links: readonly Link[], search: LoopSearch): LoopSearch => {
  if (search.visitedIds.has(id)) return search
  const idsDownTo = [...pathIds, id]
  return links
    .filter((link) => link.from === id)
    .reduce<LoopSearch>(
      (found, link) => (idsDownTo.includes(link.to) ? { ...found, closingLinks: [...found.closingLinks, link] } : searchLoops(link.to, idsDownTo, links, found)),
      { ...search, visitedIds: new Set([...search.visitedIds, id]) },
    )
}

const withoutLoops = (nodes: readonly LayoutNode[], links: readonly Link[]): Link[] => {
  const reachedIds = new Set(links.map((link) => link.to))
  const startIds = [...nodes.filter((node) => !reachedIds.has(node.id)), ...nodes.filter((node) => reachedIds.has(node.id))].map((node) => node.id)
  const { closingLinks } = startIds.reduce<LoopSearch>((search, id) => searchLoops(id, [], links, search), NOTHING_SEARCHED)
  return links.filter((link) => !closingLinks.includes(link))
}

const relaxColumns = (columnById: ColumnById, links: readonly Link[], lastColumn: number): ColumnById =>
  new Map(
    [...columnById].map(([id, column]) => {
      const behind = links.filter((link) => link.to === id).map((link) => (columnById.get(link.from) ?? 0) + 1)
      return [id, Math.min(lastColumn, Math.max(column, ...behind))] as const
    }),
  )

const rankColumns = (columnById: ColumnById): ColumnById => {
  const columns = [...new Set(columnById.values())].sort((one, two) => one - two)
  return new Map([...columnById].map(([id, column]) => [id, columns.indexOf(column)] as const))
}

const columnsOf = (nodes: readonly LayoutNode[], links: readonly Link[]): ColumnById => {
  const forwardLinks = withoutLoops(nodes, links)
  return rankColumns(
    nodes.reduce<ColumnById>(
      (columnById) => relaxColumns(columnById, forwardLinks, nodes.length - 1),
      new Map(nodes.map((node) => [node.id, 0] as const)),
    ),
  )
}

const columnOf = (columnById: ColumnById, id: string): number => columnById.get(id) ?? 0

const passesColumn = ({ from, to }: Link, column: number, columnById: ColumnById): boolean =>
  columnOf(columnById, from) < column && column < columnOf(columnById, to)

const headCentreOf = (box: Box): number => box.y + NODE_HEAD_HEIGHT / HALF

const rowCentreOf = (row: PlacedRow): number => row.y + row.height / HALF

const startOf = ({ from, fromRowId }: LayoutEdge, { nodes, rows }: Placement): number | null => {
  const row = fromRowId === null ? undefined : rows.find((placed) => placed.id === fromRowId)
  if (row !== undefined) return rowCentreOf(row)
  const node = nodes.find((placed) => placed.id === from)
  return node === undefined ? null : headCentreOf(node)
}

const laneYOf = ({ y, edgeIds }: PlacedLane, edgeId: string): number => y + edgeIds.indexOf(edgeId) * EDGE_SPACING

const laneHeightOf = (edgeIds: readonly string[]): number => (edgeIds.length - 1) * EDGE_SPACING

const comingIntoColumn = (link: Link, column: number, earlier: Placement): number | null => {
  const lane = earlier.lanes.find((placed) => placed.toId === link.to && placed.column === column - 1 && placed.edgeIds.includes(link.edge.id))
  return lane === undefined ? startOf(link.edge, earlier) : laneYOf(lane, link.edge.id)
}

const anchorsOf = (toId: string, column: number, links: readonly Link[], columnById: ColumnById, earlier: Placement): number[] =>
  links
    .filter((link) => link.to === toId && columnOf(columnById, link.from) < column)
    .flatMap((link) => comingIntoColumn(link, column, earlier) ?? [])

const laneItemOf = (toId: string, passing: readonly Link[], column: number, earlier: Placement): ColumnItem => {
  const edgeIds = passing
    .filter((link) => link.to === toId)
    .map((link, index) => ({ link, index, comingFrom: comingIntoColumn(link, column, earlier) ?? 0 }))
    .sort((one, two) => one.comingFrom - two.comingFrom || one.index - two.index)
    .map(({ link }) => link.edge.id)
  return { node: null, toId, height: laneHeightOf(edgeIds), anchorHeight: laneHeightOf(edgeIds), edgeIds }
}

const itemsOf = (nodes: readonly LayoutNode[], column: number, links: readonly Link[], columnById: ColumnById, earlier: Placement): ColumnItem[] => {
  const passing = links.filter((link) => passesColumn(link, column, columnById))
  const laneToIds = [...new Set(passing.map((link) => link.to))]
  return [
    ...nodes
      .filter((node) => columnOf(columnById, node.id) === column)
      .map((node) => ({ node, toId: node.id, height: sizeOf(node).height, anchorHeight: NODE_HEAD_HEIGHT, edgeIds: [] })),
    ...laneToIds.map((toId) => laneItemOf(toId, passing, column, earlier)),
  ]
}

const desiredTopOf = ({ toId, anchorHeight }: ColumnItem, anchorsOfItem: (toId: string) => readonly number[]): number => {
  const anchors = anchorsOfItem(toId)
  return anchors.length === 0 ? MARGIN : sumOf(anchors) / anchors.length - anchorHeight / HALF
}

const placeItem = ({ node, toId, edgeIds }: ColumnItem, column: number, box: Omit<Box, "height">): Placement =>
  node === null ? { ...NOTHING_PLACED, lanes: [{ toId, column, x: box.x, width: box.width, y: box.y, edgeIds }] } : placeNode(node, box, 0, node.id)

const placeColumn = (items: readonly ColumnItem[], column: number, x: number, anchorsOfItem: (toId: string) => readonly number[]): Placement => {
  const wanted = items
    .map((item, index) => ({ item, index, top: desiredTopOf(item, anchorsOfItem) }))
    .sort((one, two) => one.top - two.top || one.index - two.index)
  const width = Math.max(NODE_WIDTH, ...items.flatMap(({ node }) => (node === null ? [] : [sizeOf(node).width])))
  return wanted.reduce<Stack>(
    ({ bottom, placement }, { item, top }) => {
      const y = Math.round(Math.max(top, bottom, MARGIN))
      return { bottom: y + item.height + NODE_GAP, placement: mergePlacements([placement, placeItem(item, column, { x, y, width })]) }
    },
    { bottom: MARGIN, placement: NOTHING_PLACED },
  ).placement
}

const rightOf = ({ nodes, lanes }: Placement): number =>
  Math.max(MARGIN - COLUMN_GAP, ...nodes.map((placed) => placed.x + placed.width), ...lanes.map((lane) => lane.x + lane.width))

const placeColumns = (nodes: readonly LayoutNode[], links: readonly Link[], columnById: ColumnById): Placement => {
  const columns = [...new Set(columnById.values())].sort((one, two) => one - two)
  return columns.reduce<Placement>((earlier, column) => {
    const items = itemsOf(nodes, column, links, columnById, earlier)
    const placed = placeColumn(items, column, rightOf(earlier) + COLUMN_GAP, (toId) => anchorsOf(toId, column, links, columnById, earlier))
    return mergePlacements([earlier, placed])
  }, NOTHING_PLACED)
}

const lanePointsOf = ({ edge }: Link, lanes: readonly PlacedLane[]): Point[] =>
  lanes
    .filter((lane) => lane.edgeIds.includes(edge.id))
    .sort((one, two) => one.column - two.column)
    .flatMap((lane) => [{ x: lane.x, y: laneYOf(lane, edge.id) }, { x: lane.x + lane.width, y: laneYOf(lane, edge.id) }])

const routesOf = (links: readonly Link[], { nodes, rows, lanes }: Placement): Route[] => {
  const placedById = new Map(nodes.map((placed) => [placed.id, placed] as const))
  const rowById = new Map(rows.map((row) => [row.id, row] as const))
  return links.flatMap((link) => {
    const { edge } = link
    const from = placedById.get(edge.from)
    const to = placedById.get(edge.to)
    const fromTop = placedById.get(link.from)
    const toTop = placedById.get(link.to)
    if (from === undefined || to === undefined || fromTop === undefined || toTop === undefined) return []
    const fromRow = edge.fromRowId === null ? undefined : rowById.get(edge.fromRowId)
    const toRow = edge.toRowId === null ? undefined : rowById.get(edge.toRowId)
    return [{
      link,
      start: { x: fromTop.x + fromTop.width, y: fromRow === undefined ? headCentreOf(from) : rowCentreOf(fromRow) },
      lanePoints: lanePointsOf(link, lanes),
      end: { x: toTop.x, y: toRow === undefined ? headCentreOf(to) : rowCentreOf(toRow) },
      fromRow,
      toRow,
    }]
  })
}

const arrivalKeyOf = ({ link, toRow }: Route): string => toRow?.id ?? link.edge.to

const comingFromOf = ({ start, lanePoints }: Route): number => (lanePoints.length === 0 ? start.y : lanePoints[lanePoints.length - 1].y)

const arrivalOffsetOf = (route: Route, routes: readonly Route[]): number => {
  const arriving = routes
    .filter((other) => arrivalKeyOf(other) === arrivalKeyOf(route))
    .map((other, index) => ({ other, index }))
    .sort((one, two) => comingFromOf(one.other) - comingFromOf(two.other) || one.index - two.index)
  const room = (route.toRow === undefined ? NODE_HEAD_HEIGHT : route.toRow.height) - ARRIVAL_INSET * HALF
  const spacing = arriving.length < HALF ? 0 : Math.min(EDGE_SPACING, room / (arriving.length - 1))
  const position = arriving.findIndex(({ other }) => other === route)
  return Math.round((position - (arriving.length - 1) / HALF) * spacing)
}

const turnsBack = ({ start, end }: Route): boolean => start.x >= end.x

const bottomBetween = (left: number, right: number, { nodes, lanes }: Placement): number =>
  Math.max(
    ...nodes.filter((placed) => placed.x < right && placed.x + placed.width > left).map((placed) => placed.y + placed.height),
    ...lanes.filter((lane) => lane.x < right && lane.x + lane.width > left).map((lane) => lane.y + laneHeightOf(lane.edgeIds)),
  )

const pointsBelow = (route: Route, end: Point, routes: readonly Route[], placement: Placement): Point[] => {
  const turningBack = routes.filter(turnsBack)
  const right = route.start.x + EDGE_APPROACH + turningBack.indexOf(route) * EDGE_SPACING
  const left = end.x - EDGE_APPROACH
  const y = Math.max(...turningBack.map((other) => bottomBetween(other.end.x, other.start.x, placement))) + NODE_GAP / HALF + turningBack.indexOf(route) * EDGE_SPACING
  return [{ x: right, y: route.start.y }, { x: right, y }, { x: left, y }, { x: left, y: end.y }]
}

const toPlacedEdge = (route: Route, routes: readonly Route[], placement: Placement): PlacedEdge => {
  const { link, start, lanePoints, fromRow, toRow } = route
  const end = { x: route.end.x, y: route.end.y + arrivalOffsetOf(route, routes) }
  const bends = turnsBack(route) ? pointsBelow(route, end, routes, placement) : [...lanePoints, { x: end.x - EDGE_APPROACH, y: end.y }]
  return {
    ...link.edge,
    points: [start, ...bends, end],
    fromRowPoints: fromRow === undefined ? null : [{ x: fromRow.x + fromRow.width, y: start.y }, start],
    toRowPoints: toRow === undefined ? null : [end, { x: toRow.x, y: end.y }],
  }
}

const placeEdges = (links: readonly Link[], placement: Placement): PlacedEdge[] => {
  const routes = routesOf(links, placement)
  return routes.map((route) => toPlacedEdge(route, routes, placement))
}

export const layoutJourney = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): JourneyLayout => {
  if (nodes.length === 0) return { width: MARGIN * HALF, height: MARGIN * HALF, nodes: [], rows: [], edges: [] }
  const links = linksOf(nodes, edges)
  const columnById = columnsOf(nodes, links)
  const placement = placeColumns(nodes, links, columnById)
  const placedEdges = placeEdges(links, placement)
  const points = placedEdges.flatMap((placed) => placed.points)
  return {
    width: Math.max(rightOf(placement), ...points.map((point) => point.x)) + MARGIN,
    height: Math.max(...placement.nodes.map((placed) => placed.y + placed.height), ...placement.lanes.map((lane) => lane.y + laneHeightOf(lane.edgeIds)), ...points.map((point) => point.y)) + MARGIN,
    nodes: placement.nodes,
    rows: placement.rows,
    edges: placedEdges,
  }
}
