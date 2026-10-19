import { arrangeJourney, nearestSideOf, placeUnplacedCards } from "@/lib/journey-arrangement"
import { EDGE_APPROACH, layoutJourney, NODE_HEAD_HEIGHT, type LayoutEdge, type LayoutNode } from "@/lib/journey-layout"

const leaf = (id: string, rowIds: readonly string[] = []): LayoutNode => ({ id, rows: rowIds.map((rowId) => ({ id: rowId, kind: "row" })), children: [] })

const edge = (id: string, from: string, to: string, fromRowId: string | null = null): LayoutEdge => ({ id, from, to, fromRowId, toRowId: null })

const NODES = [leaf("form", ["apply"]), leaf("store"), leaf("price")]
const EDGES = [edge("form-store", "form", "store", "apply"), edge("store-price", "store", "price")]
const NOTHING_MOVED = new Map<string, { x: number, y: number }>()
const NO_SIDES = new Map<string, "left" | "top" | "bottom">()

const placedOf = <Placed extends { readonly id: string }>(placed: readonly Placed[], id: string): Placed => {
  const found = placed.find((one) => one.id === id)
  if (found === undefined) throw new Error(`Nothing is placed under ${id}.`)
  return found
}

describe("nearestSideOf", () => {
  const card = { x: 100, y: 100, width: 200, height: 300 }

  it("gives the side of a card that is nearest to a point on it", () => {
    expect(nearestSideOf({ x: 110, y: 250 }, card)).toBe("left")
    expect(nearestSideOf({ x: 180, y: 110 }, card)).toBe("top")
    expect(nearestSideOf({ x: 180, y: 390 }, card)).toBe("bottom")
  })

  it("gives the top or the bottom for a point in the right half, where no line ends", () => {
    expect(nearestSideOf({ x: 290, y: 200 }, card)).toBe("top")
    expect(nearestSideOf({ x: 290, y: 300 }, card)).toBe("bottom")
  })
})

describe("arrangeJourney", () => {
  it("leaves a layout as it is when no card was moved and every line arrives on the left", () => {
    const layout = layoutJourney(NODES, EDGES)

    expect(arrangeJourney(layout, NOTHING_MOVED, NO_SIDES)).toStrictEqual(layout)
  })

  it("puts a moved card, its rows and the ends of its lines at the stored position", () => {
    const layout = layoutJourney(NODES, EDGES)
    const arranged = arrangeJourney(layout, new Map([["form", { x: 400, y: 300 }]]), NO_SIDES)
    const form = placedOf(arranged.nodes, "form")
    const row = placedOf(arranged.rows, "apply")
    const line = placedOf(arranged.edges, "form-store")

    expect(form).toMatchObject({ x: 400, y: 300 })
    expect(row.y - form.y).toBe(placedOf(layout.rows, "apply").y - placedOf(layout.nodes, "form").y)
    expect(line.points[0]).toStrictEqual({ x: form.x + form.width, y: row.y + row.height / 2 })
    expect(line.fromRowPoints?.at(-1)).toStrictEqual(line.points[0])
    expect(arranged.height).toBeGreaterThanOrEqual(form.y + form.height)
  })

  it("leaves the cards that were not moved where the layout put them", () => {
    const layout = layoutJourney(NODES, EDGES)
    const arranged = arrangeJourney(layout, new Map([["form", { x: 400, y: 300 }]]), NO_SIDES)

    expect(placedOf(arranged.nodes, "store")).toStrictEqual(placedOf(layout.nodes, "store"))
    expect(placedOf(arranged.edges, "store-price")).toStrictEqual(placedOf(layout.edges, "store-price"))
  })

  it("places nothing when no card has a stored position, or when every card has one", () => {
    const layout = layoutJourney(NODES, EDGES)
    const everyPosition = new Map(NODES.map((one, index) => [one.id, { x: index * 400, y: 0 }] as const))

    expect(placeUnplacedCards(layout, NOTHING_MOVED)).toBe(NOTHING_MOVED)
    expect(placeUnplacedCards(layout, everyPosition)).toBe(everyPosition)
  })

  it("stacks the cards with no stored position beside the cards that have one", () => {
    const layout = layoutJourney(NODES, EDGES)
    const arranged = arrangeJourney(layout, placeUnplacedCards(layout, new Map([["form", { x: 40, y: 60 }]])), NO_SIDES)
    const form = placedOf(arranged.nodes, "form")
    const store = placedOf(arranged.nodes, "store")
    const price = placedOf(arranged.nodes, "price")

    expect(store.x).toBeGreaterThan(form.x + form.width)
    expect(price.x).toBe(store.x)
    expect(price.y).toBeGreaterThanOrEqual(store.y + store.height)
  })

  it("ends a line at the top or the bottom of the card it reaches, arriving straight", () => {
    const layout = layoutJourney(NODES, EDGES)
    const fromAbove = placedOf(arrangeJourney(layout, NOTHING_MOVED, new Map([["store-price", "top"]])).edges, "store-price")
    const fromBelow = placedOf(arrangeJourney(layout, NOTHING_MOVED, new Map([["store-price", "bottom"]])).edges, "store-price")
    const price = placedOf(layout.nodes, "price")
    const middle = price.x + price.width / 2

    expect(fromAbove.points.slice(-2)).toStrictEqual([{ x: middle, y: price.y - EDGE_APPROACH }, { x: middle, y: price.y }])
    expect(fromBelow.points.slice(-2)).toStrictEqual([{ x: middle, y: price.y + price.height + EDGE_APPROACH }, { x: middle, y: price.y + price.height }])
    expect(fromAbove.toRowPoints).toBeNull()
    expect(price.height).toBeGreaterThanOrEqual(NODE_HEAD_HEIGHT)
  })
})
