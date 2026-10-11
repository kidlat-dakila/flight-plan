import type { Point } from "@/lib/diagram-path"

export type LayoutRowKind = "heading" | "row"

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

interface Placement {
  readonly nodes: readonly PlacedNode[]
  readonly rows: readonly PlacedRow[]
}

interface Column {
  readonly x: number
  readonly placement: Placement
}

export const NODE_WIDTH = 264
export const NODE_HEAD_HEIGHT = 84
export const ROW_HEIGHT = 36
export const ROW_HEADING_HEIGHT = 16
const ROW_GAP = 6
const INSET = 10
const BOTTOM_PADDING = 8
const COLUMN_GAP = 96
const NODE_GAP = 32
const MARGIN = 24
const HALF = 2
const NOTHING_PLACED: Placement = { nodes: [], rows: [] }

const sumOf = (numbers: readonly number[]): number => numbers.reduce((total, one) => total + one, 0)

const heightOfRow = ({ kind }: LayoutRow): number => (kind === "heading" ? ROW_HEADING_HEIGHT : ROW_HEIGHT)

const heightOfRows = (rows: readonly LayoutRow[]): number => sumOf(rows.map((row) => heightOfRow(row) + ROW_GAP))

const sizeOf = (node: LayoutNode): Size => {
  const childSizes = node.children.map(sizeOf)
  const rowsHeight = heightOfRows(node.rows) + sumOf(childSizes.map((size) => size.height + ROW_GAP))
  return {
    width: Math.max(NODE_WIDTH, ...childSizes.map((size) => size.width + INSET * HALF)),
    height: NODE_HEAD_HEIGHT + rowsHeight + BOTTOM_PADDING,
  }
}

const placeNode = (node: LayoutNode, box: Omit<Box, "height">, depth: number, topId: string): Placement => {
  const { height } = sizeOf(node)
  const inner = { x: box.x + INSET, width: box.width - INSET * HALF }
  const rowsTop = box.y + NODE_HEAD_HEIGHT
  const rows = node.rows.map((row, index) => ({ ...row, nodeId: node.id, ...inner, y: rowsTop + heightOfRows(node.rows.slice(0, index)), height: heightOfRow(row) }))
  const childrenTop = rowsTop + heightOfRows(node.rows)
  const children = node.children.reduce<{ readonly top: number, readonly placed: readonly Placement[] }>(
    ({ top, placed }, child) => ({
      top: top + sizeOf(child).height + ROW_GAP,
      placed: [...placed, placeNode(child, { ...inner, y: top }, depth + 1, topId)],
    }),
    { top: childrenTop, placed: [] },
  )
  return {
    nodes: [{ id: node.id, topId, depth, ...box, height }, ...children.placed.flatMap((placed) => placed.nodes)],
    rows: [...rows, ...children.placed.flatMap((placed) => placed.rows)],
  }
}

const idsWithin = (node: LayoutNode): string[] => [node.id, ...node.children.flatMap(idsWithin)]

const liftEdges = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): LayoutEdge[] => {
  const topIdById = new Map(nodes.flatMap((node) => idsWithin(node).map((id) => [id, node.id] as const)))
  return edges.flatMap((edge) => {
    const from = topIdById.get(edge.from)
    const to = topIdById.get(edge.to)
    return from === undefined || to === undefined || from === to ? [] : [{ ...edge, from, to }]
  })
}

const relaxColumns = (columnById: ReadonlyMap<string, number>, edges: readonly LayoutEdge[], lastColumn: number): ReadonlyMap<string, number> =>
  new Map(
    [...columnById].map(([id, column]) => {
      const behind = edges.filter((edge) => edge.to === id).map((edge) => (columnById.get(edge.from) ?? 0) + 1)
      return [id, Math.min(lastColumn, Math.max(column, ...behind))] as const
    }),
  )

const columnsOf = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): ReadonlyMap<string, number> =>
  nodes.reduce<ReadonlyMap<string, number>>(
    (columnById) => relaxColumns(columnById, edges, nodes.length - 1),
    new Map(nodes.map((node) => [node.id, 0] as const)),
  )

const headCentreOf = (box: Box): number => box.y + NODE_HEAD_HEIGHT / HALF

const desiredTopOf = (node: LayoutNode, edges: readonly LayoutEdge[], placedById: ReadonlyMap<string, PlacedNode>): number => {
  const leading = edges.filter((edge) => edge.to === node.id).flatMap((edge) => {
    const placed = placedById.get(edge.from)
    return placed === undefined ? [] : [headCentreOf(placed)]
  })
  return leading.length === 0 ? MARGIN : sumOf(leading) / leading.length - NODE_HEAD_HEIGHT / HALF
}

const placeColumn = (nodes: readonly LayoutNode[], x: number, edges: readonly LayoutEdge[], placedById: ReadonlyMap<string, PlacedNode>): Placement => {
  const wanted = nodes
    .map((node, index) => ({ node, index, top: desiredTopOf(node, edges, placedById) }))
    .sort((one, two) => one.top - two.top || one.index - two.index)
  const width = Math.max(...nodes.map((node) => sizeOf(node).width))
  return wanted.reduce<{ readonly bottom: number, readonly placement: Placement }>(
    ({ bottom, placement }, { node, top }) => {
      const y = Math.round(Math.max(top, bottom, MARGIN))
      const placed = placeNode(node, { x, y, width }, 0, node.id)
      return {
        bottom: y + sizeOf(node).height + NODE_GAP,
        placement: { nodes: [...placement.nodes, ...placed.nodes], rows: [...placement.rows, ...placed.rows] },
      }
    },
    { bottom: MARGIN, placement: NOTHING_PLACED },
  ).placement
}

const placeColumns = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): Placement => {
  const columnById = columnsOf(nodes, edges)
  const columnNumbers = [...new Set(columnById.values())].sort((one, two) => one - two)
  const columns = columnNumbers.reduce<readonly Column[]>((placedColumns, columnNumber) => {
    const inColumn = nodes.filter((node) => columnById.get(node.id) === columnNumber)
    const earlier = placedColumns.flatMap((column) => column.placement.nodes)
    const right = Math.max(MARGIN - COLUMN_GAP, ...earlier.map((placed) => placed.x + placed.width))
    const x = right + COLUMN_GAP
    return [...placedColumns, { x, placement: placeColumn(inColumn, x, edges, new Map(earlier.map((placed) => [placed.id, placed] as const))) }]
  }, [])
  return { nodes: columns.flatMap((column) => column.placement.nodes), rows: columns.flatMap((column) => column.placement.rows) }
}

const rowCentreOf = (row: PlacedRow): number => row.y + row.height / HALF

const placeEdges = (edges: readonly LayoutEdge[], { nodes, rows }: Placement): PlacedEdge[] => {
  const placedById = new Map(nodes.map((placed) => [placed.id, placed] as const))
  const rowById = new Map(rows.map((row) => [row.id, row] as const))
  return edges.flatMap((edge) => {
    const from = placedById.get(edge.from)
    const to = placedById.get(edge.to)
    const fromTop = from === undefined ? undefined : placedById.get(from.topId)
    const toTop = to === undefined ? undefined : placedById.get(to.topId)
    if (from === undefined || to === undefined || fromTop === undefined || toTop === undefined || fromTop.id === toTop.id) return []
    const fromRow = edge.fromRowId === null ? undefined : rowById.get(edge.fromRowId)
    const toRow = edge.toRowId === null ? undefined : rowById.get(edge.toRowId)
    const start = { x: fromTop.x + fromTop.width, y: fromRow === undefined ? headCentreOf(from) : rowCentreOf(fromRow) }
    const end = { x: toTop.x, y: toRow === undefined ? headCentreOf(to) : rowCentreOf(toRow) }
    return [{
      ...edge,
      points: [start, end],
      fromRowPoints: fromRow === undefined ? null : [{ x: fromRow.x + fromRow.width, y: start.y }, start],
      toRowPoints: toRow === undefined ? null : [end, { x: toRow.x, y: end.y }],
    }]
  })
}

export const layoutJourney = (nodes: readonly LayoutNode[], edges: readonly LayoutEdge[]): JourneyLayout => {
  if (nodes.length === 0) return { width: MARGIN * HALF, height: MARGIN * HALF, nodes: [], rows: [], edges: [] }
  const placement = placeColumns(nodes, liftEdges(nodes, edges))
  return {
    width: Math.max(...placement.nodes.map((placed) => placed.x + placed.width)) + MARGIN,
    height: Math.max(...placement.nodes.map((placed) => placed.y + placed.height)) + MARGIN,
    nodes: placement.nodes,
    rows: placement.rows,
    edges: placeEdges(edges, placement),
  }
}
