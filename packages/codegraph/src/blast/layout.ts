import type { Blast, BlastEdge, BlastNode } from "@flightplan/configurations"

export interface Point {
  readonly x: number
  readonly y: number
}

const MIN_DISTANCE = 0.01
const MIN_RADIUS = 5
const RADIUS_PER_CONNECTION_ROOT = 1.6
const MAX_RADIUS = 14
const LABEL_CHARACTER_WIDTH = 6.7
const LABEL_HEIGHT = 34
const LABEL_GAP = 12
const COLUMN_GAP = 96
const ROW_GAP = 18
const BOARD_MARGIN = 32
const ARROW_GAP = 6
const HALF = 2
const BOTH_SIDES = 2
const ORDERING_SWEEP_COUNT = 6

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
  readonly height: number
}

const offsetBetween = (from: Point, to: Point): Point => ({ x: to.x - from.x, y: to.y - from.y })

const lengthOf = ({ x, y }: Point): number => Math.max(MIN_DISTANCE, Math.hypot(x, y))

const highestOf = (values: readonly number[]): number => (values.length === 0 ? 0 : Math.max(...values))

const averageOf = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0) / values.length

const radiusOf = (connectionCount: number): number =>
  Math.min(MAX_RADIUS, Math.round(MIN_RADIUS + RADIUS_PER_CONNECTION_ROOT * Math.sqrt(connectionCount)))

const footprintOf = (radius: number, label: string): Footprint => ({
  halfWidth: Math.max(radius, (label.length * LABEL_CHARACTER_WIDTH) / HALF) + LABEL_GAP / HALF,
  height: radius * BOTH_SIDES + LABEL_HEIGHT + ROW_GAP,
})

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

type Links = readonly (readonly number[])[]

interface Imports {
  readonly importedOf: Links
  readonly importersOf: Links
}

const importsOf = (blast: Blast): Imports => {
  const positionByPath = new Map(blast.nodes.map((node, position) => [node.path, position] as const))
  const pairs = blast.edges.flatMap((edge) => {
    const importer = positionByPath.get(edge.importer)
    const imported = positionByPath.get(edge.imported)
    return importer === undefined || imported === undefined || importer === imported ? [] : [{ importer, imported }]
  })
  return {
    importedOf: blast.nodes.map((_node, position) => pairs.filter((pair) => pair.importer === position).map((pair) => pair.imported)),
    importersOf: blast.nodes.map((_node, position) => pairs.filter((pair) => pair.imported === position).map((pair) => pair.importer)),
  }
}

interface Walk {
  readonly finished: readonly number[]
  readonly loopCloserKeys: ReadonlySet<string>
}

const keyOf = (importer: number, imported: number): string => `${String(importer)}>${String(imported)}`

const walkFrom = (position: number, importedOf: Links, trail: readonly number[], walk: Walk): Walk => {
  if (walk.finished.includes(position)) return walk
  const walked = importedOf[position].reduce<Walk>(
    (held, imported) =>
      trail.includes(imported) || imported === position
        ? { ...held, loopCloserKeys: new Set([...held.loopCloserKeys, keyOf(position, imported)]) }
        : walkFrom(imported, importedOf, [...trail, position], held),
    walk,
  )
  return { ...walked, finished: [...walked.finished, position] }
}

const columnsOf = ({ importedOf, importersOf }: Imports): number[] => {
  const walk = importedOf.reduce<Walk>((held, _imported, position) => walkFrom(position, importedOf, [], held), { finished: [], loopCloserKeys: new Set() })
  const importersFirst = [...walk.finished].reverse()
  const columnByPosition = importersFirst.reduce<ReadonlyMap<number, number>>((columns, position) => {
    const before = importersOf[position].filter((importer) => !walk.loopCloserKeys.has(keyOf(importer, position)))
    return new Map([...columns, [position, highestOf(before.map((importer) => (columns.get(importer) ?? -1) + 1))]])
  }, new Map())
  return importedOf.map((_imported, position) => columnByPosition.get(position) ?? 0)
}

const rowsByColumnOf = (columns: readonly number[]): number[][] =>
  Array.from({ length: highestOf(columns) + 1 }, (_column, column) => columns.flatMap((held, position) => (held === column ? [position] : [])))

const weightOf = (joined: readonly number[], rowOf: ReadonlyMap<number, number>, ownRow: number): number => {
  const rows = joined.flatMap((linked) => {
    const row = rowOf.get(linked)
    return row === undefined ? [] : [row]
  })
  return rows.length === 0 ? ownRow : averageOf(rows)
}

const centredRowsOf = (positions: readonly number[]): (readonly [number, number])[] =>
  positions.map((position, row) => [position, row - (positions.length - 1) / HALF] as const)

const sweep = (rowsByColumn: readonly (readonly number[])[], linksToward: Links, isLeftToRight: boolean): number[][] => {
  const order = rowsByColumn.map((_rows, column) => (isLeftToRight ? column : rowsByColumn.length - 1 - column))
  const swept = order.reduce<{ readonly rowOf: ReadonlyMap<number, number>, readonly columns: ReadonlyMap<number, readonly number[]> }>(
    (held, column) => {
      const centred = centredRowsOf(rowsByColumn[column])
      const sorted = [...centred]
        .map(([position, row]) => ({ position, weight: weightOf(linksToward[position], held.rowOf, row) }))
        .sort((one, two) => one.weight - two.weight || one.position - two.position)
        .map((seat) => seat.position)
      return { rowOf: new Map([...held.rowOf, ...centredRowsOf(sorted)]), columns: new Map([...held.columns, [column, sorted]]) }
    },
    { rowOf: new Map(), columns: new Map() },
  )
  return rowsByColumn.map((rows, column) => [...(swept.columns.get(column) ?? rows)])
}

const orderRows = (rowsByColumn: readonly (readonly number[])[], { importedOf, importersOf }: Imports): number[][] =>
  Array.from({ length: ORDERING_SWEEP_COUNT }).reduce<number[][]>(
    (held, _pass, pass) => (pass % BOTH_SIDES === 0 ? sweep(held, importersOf, true) : sweep(held, importedOf, false)),
    rowsByColumn.map((rows) => [...rows]),
  )

const columnLeftsOf = (rowsByColumn: readonly (readonly number[])[], footprints: readonly Footprint[]): number[] =>
  rowsByColumn.reduce<number[]>((lefts, _rows, column) => {
    if (column === 0) return [0]
    const widthBefore = highestOf(rowsByColumn[column - 1].map((position) => footprints[position].halfWidth)) * BOTH_SIDES
    return [...lefts, lefts[column - 1] + widthBefore + COLUMN_GAP]
  }, [])

const placeColumn = (positions: readonly number[], footprints: readonly Footprint[], radii: readonly number[], columnCentre: number, boardHeight: number): (readonly [number, Point])[] => {
  const columnHeight = positions.reduce((total, position) => total + footprints[position].height, 0)
  const tops = positions.reduce<number[]>(
    (held, _position, row) => [...held, row === 0 ? (boardHeight - columnHeight) / HALF : held[row - 1] + footprints[positions[row - 1]].height],
    [],
  )
  return positions.map((position, row) => [position, { x: columnCentre, y: tops[row] + radii[position] }] as const)
}

export const layoutBlast = (blast: Blast, labelByPath: ReadonlyMap<string, string>): BlastLayout => {
  if (blast.nodes.length === 0) return { width: BOARD_MARGIN * BOTH_SIDES, height: BOARD_MARGIN * BOTH_SIDES, nodes: [], edges: [] }
  const imports = importsOf(blast)
  const radii = blast.nodes.map((_node, position) => radiusOf(imports.importedOf[position].length + imports.importersOf[position].length))
  const footprints = blast.nodes.map((node, position) => footprintOf(radii[position], labelByPath.get(node.path) ?? node.path))
  const rowsByColumn = orderRows(rowsByColumnOf(columnsOf(imports)), imports)
  const columnLefts = columnLeftsOf(rowsByColumn, footprints)
  const columnHalfWidths = rowsByColumn.map((rows) => highestOf(rows.map((position) => footprints[position].halfWidth)))
  const boardHeight = highestOf(rowsByColumn.map((rows) => rows.reduce((total, position) => total + footprints[position].height, 0)))
  const pointByPosition = new Map(
    rowsByColumn.flatMap((rows, column) => placeColumn(rows, footprints, radii, columnLefts[column] + columnHalfWidths[column], boardHeight)),
  )
  const nodes = blast.nodes.map((node, position) => {
    const point = pointByPosition.get(position) ?? { x: 0, y: 0 }
    return { node, radius: radii[position], x: Math.round(point.x + BOARD_MARGIN), y: Math.round(point.y + BOARD_MARGIN) }
  })
  const nodeByPath = new Map(nodes.map((placed) => [placed.node.path, placed] as const))
  const lastColumn = rowsByColumn.length - 1
  return {
    width: Math.round(columnLefts[lastColumn] + columnHalfWidths[lastColumn] * BOTH_SIDES + BOARD_MARGIN * BOTH_SIDES),
    height: Math.round(boardHeight + BOARD_MARGIN * BOTH_SIDES),
    nodes,
    edges: blast.edges.flatMap((edge) => placeEdge(edge, nodeByPath)),
  }
}
