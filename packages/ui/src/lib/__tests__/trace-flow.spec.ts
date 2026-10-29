import { toTraceFlow } from "@/lib/trace-flow"
import { innerWidthOf, layoutTrace, RAIL_INDENT, railIdOf, type LayoutEdge, type LayoutNode } from "@/lib/trace-layout"

const CART_LINE: LayoutNode = {
  id: "cart-line",
  rows: [{ id: "cart-line:heading:state", kind: "heading" }, { id: "held", kind: "row" }, { id: "click", kind: "two-line-row" }],
  children: [],
}

const NODES: readonly LayoutNode[] = [
  { id: "cart-page", rows: [], children: [CART_LINE] },
  { id: "route", rows: [], children: [] },
  { id: "price", rows: [], children: [] },
]

const EDGES: readonly LayoutEdge[] = [
  { id: "held-route", from: "cart-line", to: "route", fromRowId: "held", toRowId: null },
  { id: "route-price", from: "route", to: "price", fromRowId: null, toRowId: null },
  { id: "page-price", from: "cart-page", to: "price", fromRowId: null, toRowId: null },
  { id: "price-click", from: "price", to: "cart-line", fromRowId: null, toRowId: "click" },
]

const layout = layoutTrace(NODES, EDGES)
const flow = toTraceFlow(NODES, layout)

const frameOf = (id: string) => flow.frames.find((frame) => frame.id === id)

const absoluteOf = (id: string): { x: number, y: number } => {
  const frame = frameOf(id)
  if (frame === undefined) return { x: Number.NaN, y: Number.NaN }
  const parent = frame.parentId === null ? { x: 0, y: 0 } : absoluteOf(frame.parentId)
  return { x: parent.x + frame.position.x, y: parent.y + frame.position.y }
}

describe("toTraceFlow", () => {
  it("gives a node inside another its parent and a position from the corner of that parent", () => {
    expect(frameOf("cart-page")?.parentId).toBeNull()
    expect(frameOf("cart-line")?.parentId).toBe("cart-page")
    expect(flow.frames.map((frame) => ({ id: frame.id, ...absoluteOf(frame.id), width: frame.width, height: frame.height, depth: frame.depth })))
      .toStrictEqual(layout.nodes.map(({ id, x, y, width, height, depth }) => ({ id, x, y, width, height, depth })))
  })

  it("lists a parent before the nodes inside it", () => {
    const ids = flow.frames.map((frame) => frame.id)

    expect(ids.indexOf("cart-page")).toBeLessThan(ids.indexOf("cart-line"))
  })

  it("gives each node its rows, placed from the corner of the node", () => {
    const origin = absoluteOf("cart-line")

    expect(frameOf("cart-line")?.rows.map((row) => ({ ...row, x: row.x + origin.x, y: row.y + origin.y }))).toStrictEqual(layout.rows)
    expect(frameOf("route")?.rows).toStrictEqual([])
  })

  it("gives every line a handle at each of its ends, on the node it leaves and on the node it reaches", () => {
    const pointsByLineId = Object.fromEntries(flow.lines.map((line) => {
      const source = frameOf(line.source)?.handles.find((handle) => handle.id === line.sourceHandleId && handle.type === "source")
      const target = frameOf(line.target)?.handles.find((handle) => handle.id === line.targetHandleId && handle.type === "target")
      const from = absoluteOf(line.source)
      const to = absoluteOf(line.target)
      return [line.id, [
        { x: from.x + (source?.x ?? Number.NaN), y: from.y + (source?.y ?? Number.NaN) },
        ...line.bends,
        { x: to.x + (target?.x ?? Number.NaN), y: to.y + (target?.y ?? Number.NaN) },
      ]] as const
    }))
    const [heldRoute, routePrice, pagePrice, priceClick] = layout.edges

    expect(pointsByLineId).toStrictEqual({
      "held-route": heldRoute.points,
      "route-price": routePrice.points,
      "page-price": pagePrice.points,
      "price-click": priceClick.points,
      "held-route:from-row": heldRoute.fromRowPoints,
      "price-click:to-row": priceClick.toRowPoints,
    })
  })

  it("draws the line between two nodes under the nodes, and the short line that carries it to a row above them, after every line under the nodes", () => {
    expect(flow.lines.map(({ id, edgeId, source, target, isAboveNodes }) => ({ id, edgeId, source, target, isAboveNodes }))).toStrictEqual([
      { id: "held-route", edgeId: "held-route", source: "cart-line", target: "route", isAboveNodes: false },
      { id: "route-price", edgeId: "route-price", source: "route", target: "price", isAboveNodes: false },
      { id: "page-price", edgeId: "page-price", source: "cart-page", target: "price", isAboveNodes: false },
      { id: "price-click", edgeId: "price-click", source: "price", target: "cart-line", isAboveNodes: false },
      { id: "held-route:from-row", edgeId: "held-route", source: "cart-line", target: "cart-line", isAboveNodes: true },
      { id: "price-click:to-row", edgeId: "price-click", source: "cart-line", target: "cart-line", isAboveNodes: true },
    ])
  })

  it("ends a line at an arrow where it reaches a head, and at the row when a short line carries it there", () => {
    expect(Object.fromEntries(flow.lines.map((line) => [line.id, line.hasArrow]))).toStrictEqual({
      "held-route": true,
      "route-price": true,
      "page-price": true,
      "price-click": false,
      "held-route:from-row": false,
      "price-click:to-row": true,
    })
  })

  it("draws nothing for a diagram with no node", () => {
    expect(toTraceFlow([], layoutTrace([], []))).toStrictEqual({ frames: [], lines: [] })
  })

  it("sets a child card on a rail into its parent at the indent of the rail, under the row that names it, and keeps the rail and that row on the parent", () => {
    const page: LayoutNode = {
      id: "team-page",
      rows: [{ id: "section", kind: "render-group", rows: [{ id: "section:return", kind: "render-return" }, { id: "slot-row", kind: "render-row" }, { id: "slot", kind: "card" }] }],
      children: [{ id: "slot", rows: [{ id: "slot-call", kind: "row" }], children: [] }],
    }
    const nested = toTraceFlow([page], layoutTrace([page], []))
    const [parent, slot] = nested.frames
    const slotRow = parent.rows.find((row) => row.id === "slot-row")

    expect([slot.id, slot.parentId, slot.position.x]).toStrictEqual(["slot", "team-page", (parent.width - innerWidthOf(parent.width)) / 2 + RAIL_INDENT])
    expect(slot.position.y).toBeGreaterThan((slotRow?.y ?? 0) + (slotRow?.height ?? 0))
    expect(parent.rows.map((row) => row.id)).toStrictEqual(["section:return", railIdOf("section"), "slot-row"])
    expect(slot.rows.map((row) => row.id)).toStrictEqual(["slot-call"])
  })
})
