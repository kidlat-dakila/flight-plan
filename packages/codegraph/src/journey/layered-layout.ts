import type { Box } from "./ui-cards"

const HALF = 2
const LANE_MARK = "|"
const STEEPEST_SLOPE = 1.5

export interface Point {
  readonly x: number
  readonly y: number
}

export interface LayeredItem {
  readonly id: string
  readonly width: number
  readonly height: number
}

export interface LayeredLink {
  readonly id: string
  readonly fromId: string
  readonly toId: string
  readonly fromOffsetY: number | null
  readonly toOffsetY: number | null
}

export interface LayerSpacing {
  readonly itemGap: number
  readonly laneGap: number
  readonly columnGap: number
  readonly widestColumnGap: number
  readonly margin: number
}

export interface LayeredLayout {
  readonly width: number
  readonly height: number
  readonly boxes: ReadonlyMap<string, Box>
  readonly routes: ReadonlyMap<string, readonly Point[]>
}

interface AnchoredLink {
  readonly id: string
  readonly fromId: string
  readonly toId: string
  readonly fromOffsetY: number
  readonly toOffsetY: number
}

interface Slot {
  readonly id: string
  readonly column: number
  readonly height: number
  readonly isLane: boolean
}

interface Hop {
  readonly fromId: string
  readonly toId: string
  readonly fromOffsetY: number
  readonly toOffsetY: number
}

interface Walk {
  readonly doneIds: ReadonlySet<string>
  readonly backLinkIds: ReadonlySet<string>
}

interface Pool {
  readonly total: number
  readonly size: number
}

interface Sweep {
  readonly side: Side
  readonly isBackward: boolean
}

interface ColumnSpan {
  readonly left: number
  readonly width: number
}

type Side = "before" | "after" | "both"
type Columns = ReadonlyMap<string, number>
type Tops = ReadonlyMap<string, number>

const NOTHING_WALKED: Walk = { doneIds: new Set(), backLinkIds: new Set() }

const SWEEPS: readonly Sweep[] = [
  { side: "before", isBackward: false },
  { side: "after", isBackward: true },
  { side: "both", isBackward: false },
  { side: "both", isBackward: true },
  { side: "both", isBackward: false },
  { side: "both", isBackward: true },
]

const meanOf = (values: readonly number[]): number => values.reduce((total, value) => total + value, 0) / values.length

const columnOf = (columns: Columns, itemId: string): number => columns.get(itemId) ?? 0

const topOf = (tops: Tops, slotId: string): number => tops.get(slotId) ?? 0

const walkFrom = (links: readonly AnchoredLink[], itemId: string, pathIds: ReadonlySet<string>, walk: Walk): Walk => {
  if (walk.doneIds.has(itemId)) return walk
  const withinIds = new Set([...pathIds, itemId])
  const walked = links
    .filter((link) => link.fromId === itemId)
    .reduce<Walk>(
      (reached, link) =>
        withinIds.has(link.toId)
          ? { ...reached, backLinkIds: new Set([...reached.backLinkIds, link.id]) }
          : walkFrom(links, link.toId, withinIds, reached),
      walk,
    )
  return { ...walked, doneIds: new Set([...walked.doneIds, itemId]) }
}

const forwardLinksOf = (items: readonly LayeredItem[], links: readonly AnchoredLink[]): AnchoredLink[] => {
  const { backLinkIds } = items.reduce<Walk>((walk, item) => walkFrom(links, item.id, new Set(), walk), NOTHING_WALKED)
  return links.filter((link) => !backLinkIds.has(link.id))
}

const deepenedOnce = (items: readonly LayeredItem[], links: readonly AnchoredLink[], columns: Columns): Columns =>
  new Map(items.map((item) => [
    item.id,
    Math.max(0, ...links.filter((link) => link.toId === item.id).map((link) => columnOf(columns, link.fromId) + 1)),
  ]))

const besideTargets = (items: readonly LayeredItem[], links: readonly AnchoredLink[], columns: Columns): Columns =>
  new Map(items.map((item) => {
    const isSource = links.every((link) => link.toId !== item.id)
    const targetColumns = links.filter((link) => link.fromId === item.id).map((link) => columnOf(columns, link.toId))
    return [item.id, isSource && targetColumns.length > 0 ? Math.min(...targetColumns) - 1 : columnOf(columns, item.id)]
  }))

const assignColumns = (items: readonly LayeredItem[], links: readonly AnchoredLink[]): Columns =>
  besideTargets(items, links, items.reduce<Columns>((columns) => deepenedOnce(items, links, columns), new Map()))

const laneIdOf = (linkId: string, column: number): string => `${linkId}${LANE_MARK}${String(column)}`

const laneColumnsOf = (link: AnchoredLink, columns: Columns): number[] => {
  const fromColumn = columnOf(columns, link.fromId)
  return Array.from({ length: Math.max(0, columnOf(columns, link.toId) - fromColumn - 1) }, (_, position) => fromColumn + 1 + position)
}

const hopsOf = (link: AnchoredLink, columns: Columns): Hop[] => {
  const stops = [
    { id: link.fromId, offsetY: link.fromOffsetY },
    ...laneColumnsOf(link, columns).map((column) => ({ id: laneIdOf(link.id, column), offsetY: 0 })),
    { id: link.toId, offsetY: link.toOffsetY },
  ]
  return stops.slice(1).map((stop, position) => ({
    fromId: stops[position].id,
    toId: stop.id,
    fromOffsetY: stops[position].offsetY,
    toOffsetY: stop.offsetY,
  }))
}

const listSlots = (items: readonly LayeredItem[], links: readonly AnchoredLink[], columns: Columns): Slot[] => [
  ...items.map((item) => ({ id: item.id, column: columnOf(columns, item.id), height: item.height, isLane: false })),
  ...links.flatMap((link) => laneColumnsOf(link, columns).map((column) => ({ id: laneIdOf(link.id, column), column, height: 0, isLane: true }))),
]

const gapBetween = (above: Slot, below: Slot, spacing: LayerSpacing): number => (above.isLane || below.isLane ? spacing.laneGap : spacing.itemGap)

const stackedOffsets = (slots: readonly Slot[], spacing: LayerSpacing): number[] =>
  slots.reduce<number[]>(
    (offsets, slot, position) =>
      position === 0
        ? [0]
        : [...offsets, offsets[position - 1] + slots[position - 1].height + gapBetween(slots[position - 1], slot, spacing)],
    [],
  )

const pooledWith = (pools: readonly Pool[], pool: Pool): readonly Pool[] => {
  if (pools.length === 0) return [pool]
  const last = pools[pools.length - 1]
  if (last.total / last.size <= pool.total / pool.size) return [...pools, pool]
  return pooledWith(pools.slice(0, -1), { total: last.total + pool.total, size: last.size + pool.size })
}

const nearestNonDecreasing = (values: readonly number[]): number[] =>
  values
    .reduce<readonly Pool[]>((pools, value) => pooledWith(pools, { total: value, size: 1 }), [])
    .flatMap((pool) => Array.from({ length: pool.size }, () => pool.total / pool.size))

const wishedTopsOf = (slot: Slot, hops: readonly Hop[], tops: Tops, side: Side): number[] => [
  ...(side === "after" ? [] : hops.filter((hop) => hop.toId === slot.id).map((hop) => topOf(tops, hop.fromId) + hop.fromOffsetY - hop.toOffsetY)),
  ...(side === "before" ? [] : hops.filter((hop) => hop.fromId === slot.id).map((hop) => topOf(tops, hop.toId) + hop.toOffsetY - hop.fromOffsetY)),
]

const wishedTopOf = (slot: Slot, hops: readonly Hop[], tops: Tops, side: Side): number => {
  const wishedTops = wishedTopsOf(slot, hops, tops, side)
  return wishedTops.length === 0 ? topOf(tops, slot.id) : meanOf(wishedTops)
}

const alignColumn = (slots: readonly Slot[], hops: readonly Hop[], tops: Tops, side: Side, spacing: LayerSpacing): [string, number][] => {
  const ordered = slots
    .map((slot) => ({ slot, wishedTop: wishedTopOf(slot, hops, tops, side) }))
    .sort((one, two) =>
      (one.wishedTop + one.slot.height / HALF) - (two.wishedTop + two.slot.height / HALF) || topOf(tops, one.slot.id) - topOf(tops, two.slot.id))
  const offsets = stackedOffsets(ordered.map(({ slot }) => slot), spacing)
  const settled = nearestNonDecreasing(ordered.map(({ wishedTop }, position) => wishedTop - offsets[position]))
  return ordered.map(({ slot }, position) => [slot.id, settled[position] + offsets[position]])
}

const stackColumn = (slots: readonly Slot[], spacing: LayerSpacing): [string, number][] => {
  const offsets = stackedOffsets(slots, spacing)
  return slots.map((slot, position) => [slot.id, offsets[position]])
}

const sweepOnce = (slotColumns: readonly (readonly Slot[])[], hops: readonly Hop[], tops: Tops, { side, isBackward }: Sweep, spacing: LayerSpacing): Tops =>
  (isBackward ? [...slotColumns].reverse() : slotColumns).reduce<Tops>(
    (placed, slots) => new Map([...placed, ...alignColumn(slots, hops, placed, side, spacing)]),
    tops,
  )

const placeTops = (slotColumns: readonly (readonly Slot[])[], hops: readonly Hop[], spacing: LayerSpacing): Tops =>
  SWEEPS.reduce<Tops>(
    (tops, sweep) => sweepOnce(slotColumns, hops, tops, sweep, spacing),
    new Map(slotColumns.flatMap((slots) => stackColumn(slots, spacing))),
  )

const steepestDropAfter = (column: number, slots: readonly Slot[], hops: readonly Hop[], tops: Tops): number => {
  const leavingIds = new Set(slots.filter((slot) => slot.column === column).map((slot) => slot.id))
  return Math.max(
    0,
    ...hops
      .filter((hop) => leavingIds.has(hop.fromId))
      .map((hop) => Math.abs(topOf(tops, hop.fromId) + hop.fromOffsetY - topOf(tops, hop.toId) - hop.toOffsetY)),
  )
}

const columnGapOf = (drop: number, spacing: LayerSpacing): number =>
  Math.min(spacing.widestColumnGap, Math.max(spacing.columnGap, drop / STEEPEST_SLOPE))

const spanColumns = (widths: readonly number[], gaps: readonly number[], margin: number): ColumnSpan[] =>
  widths.reduce<ColumnSpan[]>(
    (spans, width, column) =>
      column === 0
        ? [{ left: margin, width }]
        : [...spans, { left: spans[column - 1].left + spans[column - 1].width + gaps[column - 1], width }],
    [],
  )

const withoutRepeats = (points: readonly Point[]): Point[] =>
  points.filter((point, position) => position === 0 || point.x !== points[position - 1].x || point.y !== points[position - 1].y)

const anchored = (items: readonly LayeredItem[], links: readonly LayeredLink[]): AnchoredLink[] => {
  const heights = new Map(items.map((item) => [item.id, item.height]))
  return links.flatMap((link) => {
    const fromHeight = heights.get(link.fromId)
    const toHeight = heights.get(link.toId)
    if (fromHeight === undefined || toHeight === undefined) return []
    return [{ ...link, fromOffsetY: link.fromOffsetY ?? fromHeight / HALF, toOffsetY: link.toOffsetY ?? toHeight / HALF }]
  })
}

export const layoutLayers = (items: readonly LayeredItem[], links: readonly LayeredLink[], spacing: LayerSpacing): LayeredLayout => {
  const anchoredLinks = anchored(items, links)
  const forwardLinks = forwardLinksOf(items, anchoredLinks)
  const forwardIds = new Set(forwardLinks.map((link) => link.id))
  const columns = assignColumns(items, forwardLinks)
  const slots = listSlots(items, forwardLinks, columns)
  const hops = forwardLinks.flatMap((link) => hopsOf(link, columns))
  const columnCount = Math.max(0, ...slots.map((slot) => slot.column + 1))
  const slotColumns = Array.from({ length: columnCount }, (_, column) => slots.filter((slot) => slot.column === column))
  const tops = placeTops(slotColumns, hops, spacing)
  const highestTop = Math.min(0, ...slots.map((slot) => topOf(tops, slot.id)))
  const yOf = (slotId: string): number => Math.round(topOf(tops, slotId) - highestTop + spacing.margin)
  const widths = slotColumns.map((column) => Math.max(0, ...items.filter((item) => column.some((slot) => slot.id === item.id)).map((item) => item.width)))
  const gaps = slotColumns.map((_, column) => columnGapOf(steepestDropAfter(column, slots, hops, tops), spacing))
  const spans = spanColumns(widths, gaps.map(Math.round), spacing.margin)
  const boxes = new Map(items.map((item): [string, Box] => [
    item.id,
    { x: spans[columnOf(columns, item.id)].left, y: yOf(item.id), width: item.width, height: item.height },
  ]))
  const routeOf = (link: AnchoredLink): Point[] => {
    const fromSpan = spans[columnOf(columns, link.fromId)]
    const start = { x: fromSpan.left + (boxes.get(link.fromId)?.width ?? 0), y: yOf(link.fromId) + link.fromOffsetY }
    const end = { x: spans[columnOf(columns, link.toId)].left, y: yOf(link.toId) + link.toOffsetY }
    if (!forwardIds.has(link.id)) return [start, end]
    return withoutRepeats([
      start,
      { x: fromSpan.left + fromSpan.width, y: start.y },
      ...laneColumnsOf(link, columns).flatMap((column) => {
        const y = yOf(laneIdOf(link.id, column))
        return [{ x: spans[column].left, y }, { x: spans[column].left + spans[column].width, y }]
      }),
      end,
    ])
  }
  const lastSpan = spans.length === 0 ? { left: spacing.margin, width: 0 } : spans[spans.length - 1]
  return {
    width: lastSpan.left + lastSpan.width + spacing.margin,
    height: Math.max(0, ...slots.map((slot) => yOf(slot.id) + slot.height)) + spacing.margin,
    boxes,
    routes: new Map(anchoredLinks.map((link) => [link.id, routeOf(link)])),
  }
}
