import { groupBy } from "@/shared/group-by"
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

const highestOf = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((highest, value) => Math.max(highest, value), Number.NEGATIVE_INFINITY)

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

interface ImportPair {
  readonly importer: number
  readonly imported: number
}

const linksOf = (pairs: readonly ImportPair[], positionCount: number, from: keyof ImportPair, to: keyof ImportPair): Links => {
  const pairsByPosition = groupBy(pairs, (pair) => pair[from])
  return Array.from({ length: positionCount }, (_links, position) => (pairsByPosition.get(position) ?? []).map((pair) => pair[to]))
}

const importsOf = (blastDiagram: Blast): Imports => {
  const positionByPath = new Map(blastDiagram.nodes.map((node, position) => [node.path, position] as const))
  const pairs = blastDiagram.edges.flatMap((edge) => {
    const importer = positionByPath.get(edge.importer)
    const imported = positionByPath.get(edge.imported)
    return importer === undefined || imported === undefined || importer === imported ? [] : [{ importer, imported }]
  })
  return {
    importedOf: linksOf(pairs, blastDiagram.nodes.length, "importer", "imported"),
    importersOf: linksOf(pairs, blastDiagram.nodes.length, "imported", "importer"),
  }
}

interface PositionTrie<Value> {
  readonly value: Value | undefined
  readonly branches: readonly (PositionTrie<Value> | undefined)[]
}

const BINARY = 2
const EMPTY_TRIE: PositionTrie<never> = { value: undefined, branches: [] }

const digitsOf = (position: number): number[] => Array.from(position.toString(BINARY), Number)

const branchOf = <Value>(node: PositionTrie<Value> | undefined, digit: number): PositionTrie<Value> | undefined => node?.branches[digit]

const valueAt = <Value>(trie: PositionTrie<Value>, position: number): Value | undefined =>
  digitsOf(position).reduce<PositionTrie<Value> | undefined>(branchOf, trie)?.value

const withBranch = <Value>(branches: PositionTrie<Value>["branches"], digit: number, branch: PositionTrie<Value>): PositionTrie<Value>["branches"] =>
  Array.from({ length: BINARY }, (_branch, at) => (at === digit ? branch : branches[at]))

const withValueAlong = <Value>(node: PositionTrie<Value>, digits: readonly number[], value: Value): PositionTrie<Value> => {
  if (digits.length === 0) return { ...node, value }
  const [digit, ...rest] = digits
  return { ...node, branches: withBranch(node.branches, digit, withValueAlong(node.branches[digit] ?? EMPTY_TRIE, rest, value)) }
}

const withValueAt = <Value>(trie: PositionTrie<Value>, position: number, value: Value): PositionTrie<Value> =>
  withValueAlong(trie, digitsOf(position), value)

interface Stacked<Item> {
  readonly item: Item
  readonly below: Stacked<Item> | null
}

function* itemsOf<Item>(stacked: Stacked<Item> | null): Generator<Item> {
  for (let held = stacked; held !== null; held = held.below) yield held.item
}

const iterateUntil = <State>(start: State, step: (state: State) => State, isDone: (state: State) => boolean): State => {
  for (let state = start; ; state = step(state)) if (isDone(state)) return state
}

interface Walk {
  readonly finished: readonly number[]
  readonly loopCloserKeys: ReadonlySet<string>
}

const keyOf = (importer: number, imported: number): string => `${String(importer)}>${String(imported)}`

const ENTERED = "entered"
const FINISHED = "finished"

type WalkMark = typeof ENTERED | typeof FINISHED

interface Frame {
  readonly position: number
  readonly nextImport: number
}

interface Walking {
  readonly trail: Stacked<Frame> | null
  readonly marks: PositionTrie<WalkMark>
  readonly finished: Stacked<number> | null
  readonly loopCloserKeys: Stacked<string> | null
}

const NOT_WALKED: Walking = { trail: null, marks: EMPTY_TRIE, finished: null, loopCloserKeys: null }

const enter = (walking: Walking, position: number): Walking => ({
  ...walking,
  trail: { item: { position, nextImport: 0 }, below: walking.trail },
  marks: withValueAt(walking.marks, position, ENTERED),
})

const leave = (walking: Walking, { item: { position }, below }: Stacked<Frame>): Walking => ({
  ...walking,
  trail: below,
  marks: withValueAt(walking.marks, position, FINISHED),
  finished: { item: position, below: walking.finished },
})

const follow = (walking: Walking, { item: { position, nextImport }, below }: Stacked<Frame>, imported: number): Walking => {
  const advanced = { ...walking, trail: { item: { position, nextImport: nextImport + 1 }, below } }
  const mark = valueAt(walking.marks, imported)
  if (mark === ENTERED) return { ...advanced, loopCloserKeys: { item: keyOf(position, imported), below: walking.loopCloserKeys } }
  return mark === FINISHED ? advanced : enter(advanced, imported)
}

const stepThrough = (importedOf: Links) => (walking: Walking): Walking => {
  if (walking.trail === null) return walking
  const imports = importedOf[walking.trail.item.position]
  const { nextImport } = walking.trail.item
  return nextImport < imports.length ? follow(walking, walking.trail, imports[nextImport]) : leave(walking, walking.trail)
}

const isTrailEmpty = (walking: Walking): boolean => walking.trail === null

const walkFromRoot = (importedOf: Links) => (walking: Walking, _imported: readonly number[], root: number): Walking =>
  valueAt(walking.marks, root) === undefined ? iterateUntil(enter(walking, root), stepThrough(importedOf), isTrailEmpty) : walking

const walkImports = (importedOf: Links): Walk => {
  const walked = importedOf.reduce(walkFromRoot(importedOf), NOT_WALKED)
  return {
    finished: [...itemsOf(walked.finished)].reverse(),
    loopCloserKeys: new Set([...itemsOf(walked.loopCloserKeys)].reverse()),
  }
}

const columnsOf = ({ importedOf, importersOf }: Imports): number[] => {
  const walk = walkImports(importedOf)
  const importersFirst = [...walk.finished].reverse()
  const columnByPosition = importersFirst.reduce<PositionTrie<number>>((columns, position) => {
    const before = importersOf[position].filter((importer) => !walk.loopCloserKeys.has(keyOf(importer, position)))
    return withValueAt(columns, position, highestOf(before.map((importer) => (valueAt(columns, importer) ?? -1) + 1)))
  }, EMPTY_TRIE)
  return importedOf.map((_imported, position) => valueAt(columnByPosition, position) ?? 0)
}

export const blastColumnsOf = (blastDiagram: Blast): number[] => columnsOf(importsOf(blastDiagram))

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

export const layoutBlast = (blastDiagram: Blast, labelByPath: ReadonlyMap<string, string>): BlastLayout => {
  if (blastDiagram.nodes.length === 0) return { width: BOARD_MARGIN * BOTH_SIDES, height: BOARD_MARGIN * BOTH_SIDES, nodes: [], edges: [] }
  const imports = importsOf(blastDiagram)
  const radii = blastDiagram.nodes.map((_node, position) => radiusOf(imports.importedOf[position].length + imports.importersOf[position].length))
  const footprints = blastDiagram.nodes.map((node, position) => footprintOf(radii[position], labelByPath.get(node.path) ?? node.path))
  const rowsByColumn = orderRows(rowsByColumnOf(columnsOf(imports)), imports)
  const columnLefts = columnLeftsOf(rowsByColumn, footprints)
  const columnHalfWidths = rowsByColumn.map((rows) => highestOf(rows.map((position) => footprints[position].halfWidth)))
  const boardHeight = highestOf(rowsByColumn.map((rows) => rows.reduce((total, position) => total + footprints[position].height, 0)))
  const pointByPosition = new Map(
    rowsByColumn.flatMap((rows, column) => placeColumn(rows, footprints, radii, columnLefts[column] + columnHalfWidths[column], boardHeight)),
  )
  const nodes = blastDiagram.nodes.map((node, position) => {
    const point = pointByPosition.get(position) ?? { x: 0, y: 0 }
    return { node, radius: radii[position], x: Math.round(point.x + BOARD_MARGIN), y: Math.round(point.y + BOARD_MARGIN) }
  })
  const nodeByPath = new Map(nodes.map((placed) => [placed.node.path, placed] as const))
  const lastColumn = rowsByColumn.length - 1
  return {
    width: Math.round(columnLefts[lastColumn] + columnHalfWidths[lastColumn] * BOTH_SIDES + BOARD_MARGIN * BOTH_SIDES),
    height: Math.round(boardHeight + BOARD_MARGIN * BOTH_SIDES),
    nodes,
    edges: blastDiagram.edges.flatMap((edge) => placeEdge(edge, nodeByPath)),
  }
}
