import { EDGE_APPROACH, EDGE_SPACING, layoutJourney, NODE_HEAD_HEIGHT, NODE_WIDTH, ROW_HEADING_HEIGHT, ROW_HEIGHT, TWO_LINE_ROW_HEIGHT, type LayoutEdge, type LayoutNode } from "@/lib/journey-layout"

const leaf = (id: string, rowIds: readonly string[] = []): LayoutNode => ({ id, rows: rowIds.map((rowId) => ({ id: rowId, kind: "row" })), children: [] })

const edge = (id: string, from: string, to: string, rowIds: Partial<Pick<LayoutEdge, "fromRowId" | "toRowId">> = {}): LayoutEdge => ({ id, from, to, fromRowId: null, toRowId: null, ...rowIds })

const HALF = 2

const approachTo = ({ x, y }: { readonly x: number, readonly y: number }): { x: number, y: number } => ({ x: x - EDGE_APPROACH, y })

describe("layoutJourney", () => {
  it("places a node one column after the node that leads to it, level with it", () => {
    const { nodes, edges } = layoutJourney([leaf("page"), leaf("price")], [edge("a", "page", "price")])
    const [page, price] = nodes

    expect(price.x).toBeGreaterThan(page.x + page.width)
    expect(price.y).toBe(page.y)
    expect(edges).toStrictEqual([
      { ...edge("a", "page", "price"), points: [{ x: page.x + page.width, y: page.y + NODE_HEAD_HEIGHT / HALF }, approachTo({ x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }), { x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }], fromRowPoints: null, toRowPoints: null },
    ])
  })

  it("stacks the nodes of one column without overlap", () => {
    const { nodes } = layoutJourney([leaf("page"), leaf("price"), leaf("tax")], [edge("a", "page", "price"), edge("b", "page", "tax")])
    const [, price, tax] = nodes

    expect(tax.x).toBe(price.x)
    expect(tax.y).toBeGreaterThanOrEqual(price.y + price.height)
  })

  it("draws the children of a node inside it, below its rows, and draws no edge between the two", () => {
    const card: LayoutNode = { ...leaf("page", ["click"]), children: [leaf("list")] }
    const { nodes, rows, edges } = layoutJourney([card], [edge("a", "page", "list")])
    const [page, list] = nodes
    const [click] = rows

    expect([page.depth, list.depth, list.topId]).toStrictEqual([0, 1, "page"])
    expect(click.nodeId).toBe("page")
    expect(click.y).toBeGreaterThanOrEqual(page.y + NODE_HEAD_HEIGHT)
    expect(list.y).toBeGreaterThanOrEqual(click.y + click.height)
    expect(list.x).toBeGreaterThan(page.x)
    expect(list.x + list.width).toBeLessThan(page.x + page.width)
    expect(list.y + list.height).toBeLessThanOrEqual(page.y + page.height)
    expect(edges).toStrictEqual([])
  })

  it("places a heading above the rows it titles, lower than a row, and each row below the last", () => {
    const card: LayoutNode = { id: "page", rows: [{ id: "state", kind: "heading" }, { id: "held", kind: "row" }, { id: "total", kind: "row" }], children: [] }
    const { nodes: [page], rows: [heading, held, total] } = layoutJourney([card], [])

    expect([heading.kind, heading.height, held.height]).toStrictEqual(["heading", ROW_HEADING_HEIGHT, ROW_HEIGHT])
    expect(heading.y).toBeGreaterThanOrEqual(page.y + NODE_HEAD_HEIGHT)
    expect(held.y).toBeGreaterThanOrEqual(heading.y + heading.height)
    expect(total.y).toBeGreaterThanOrEqual(held.y + held.height)
    expect(total.y + total.height).toBeLessThanOrEqual(page.y + page.height)
  })

  it("ends an edge that leaves a node inside another at the edge of the outer one, level with the inner one", () => {
    const card: LayoutNode = { ...leaf("page"), children: [leaf("list")] }
    const { nodes, edges } = layoutJourney([card, leaf("load")], [edge("a", "list", "load")])
    const [page, list, load] = nodes

    const reaching = { x: load.x, y: load.y + NODE_HEAD_HEIGHT / HALF }

    expect(edges[0].points).toStrictEqual([{ x: page.x + page.width, y: list.y + NODE_HEAD_HEIGHT / HALF }, approachTo(reaching), reaching])
  })

  it("gives a row of two lines more height than a row of one, and places the next row below it", () => {
    const card: LayoutNode = { id: "page", rows: [{ id: "click", kind: "two-line-row" }, { id: "held", kind: "row" }], children: [] }
    const { nodes: [page], rows: [click, held] } = layoutJourney([card], [])

    expect([click.height, held.height]).toStrictEqual([TWO_LINE_ROW_HEIGHT, ROW_HEIGHT])
    expect(TWO_LINE_ROW_HEIGHT).toBeGreaterThan(ROW_HEIGHT)
    expect(held.y).toBeGreaterThanOrEqual(click.y + click.height)
    expect(held.y + held.height).toBeLessThanOrEqual(page.y + page.height)
  })

  it("joins an edge to the row it leaves and to the row it reaches, level with each, through the edge of the outer node", () => {
    const card: LayoutNode = { ...leaf("page"), children: [leaf("form", ["apply"])] }
    const { nodes, rows, edges } = layoutJourney([card, leaf("store", ["items"])], [edge("a", "form", "store", { fromRowId: "apply", toRowId: "items" })])
    const [page, , store] = nodes
    const [apply, items] = rows
    const leaving = { x: page.x + page.width, y: apply.y + apply.height / HALF }
    const reaching = { x: store.x, y: items.y + items.height / HALF }

    expect(edges[0].points).toStrictEqual([leaving, approachTo(reaching), reaching])
    expect(edges[0].fromRowPoints).toStrictEqual([{ x: apply.x + apply.width, y: leaving.y }, leaving])
    expect(edges[0].toRowPoints).toStrictEqual([reaching, { x: items.x, y: reaching.y }])
  })

  it("joins an edge to the head of a node when the row it names is not drawn", () => {
    const { nodes, edges } = layoutJourney([leaf("page"), leaf("price")], [edge("a", "page", "price", { fromRowId: "gone", toRowId: "gone-too" })])
    const [page, price] = nodes

    const reaching = { x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }

    expect(edges[0].points).toStrictEqual([{ x: page.x + page.width, y: page.y + NODE_HEAD_HEIGHT / HALF }, approachTo(reaching), reaching])
    expect([edges[0].fromRowPoints, edges[0].toRowPoints]).toStrictEqual([null, null])
  })

  it("gives the board the size of what is on it, and a leaf the width of a node", () => {
    const { width, height, nodes } = layoutJourney([leaf("page")], [])

    expect(nodes[0].width).toBe(NODE_WIDTH)
    expect(width).toBeGreaterThan(nodes[0].x + nodes[0].width)
    expect(height).toBeGreaterThan(nodes[0].y + nodes[0].height)
  })

  it("places a node level with the row that leads to it", () => {
    const { nodes, rows } = layoutJourney([leaf("page", ["state", "hook", "submit"]), leaf("handler")], [edge("a", "page", "handler", { fromRowId: "submit" })])
    const [, handler] = nodes
    const submit = rows[2]

    expect(handler.y + NODE_HEAD_HEIGHT / HALF).toBe(submit.y + submit.height / HALF)
  })

  it("leads an edge that passes a column through a lane beside the nodes of that column, level across it", () => {
    const { nodes, edges } = layoutJourney([leaf("page"), leaf("price"), leaf("tax")], [edge("a", "page", "price"), edge("b", "price", "tax"), edge("c", "page", "tax")])
    const [page, price, tax] = nodes
    const passing = edges.find((placed) => placed.id === "c")?.points ?? []
    const [start, entering, leaving, approaching, end] = passing

    expect(passing).toHaveLength(5)
    expect([start.x, entering.x, leaving.x, approaching.x, end.x]).toStrictEqual([page.x + page.width, price.x, price.x + price.width, tax.x - EDGE_APPROACH, tax.x])
    expect(entering.y).toBe(leaving.y)
    expect(entering.y < price.y || entering.y > price.y + price.height).toBe(true)
  })

  it("leads the edges that pass a column to the same node through lanes of their own, side by side in the order they come from", () => {
    const { edges } = layoutJourney(
      [leaf("page"), leaf("form"), leaf("price"), leaf("tax")],
      [edge("a", "page", "price"), edge("b", "form", "price"), edge("c", "price", "tax"), edge("e", "form", "tax"), edge("d", "page", "tax")],
    )
    const laneOf = (id: string): number => (edges.find((placed) => placed.id === id)?.points ?? [])[1].y

    expect(laneOf("e") - laneOf("d")).toBe(EDGE_SPACING)
    expect(edges.find((placed) => placed.id === "d")?.points).toHaveLength(5)
  })

  it("keeps the lanes of a column clear of its nodes", () => {
    const { nodes, edges } = layoutJourney(
      [leaf("page"), leaf("form"), leaf("price"), leaf("tax")],
      [edge("a", "page", "price"), edge("b", "form", "price"), edge("c", "price", "tax"), edge("e", "form", "tax"), edge("d", "page", "tax")],
    )
    const price = nodes[2]
    const laneYs = ["d", "e"].map((id) => (edges.find((placed) => placed.id === id)?.points ?? [])[1].y)

    expect(laneYs.every((y) => y < price.y || y > price.y + price.height)).toBe(true)
  })

  it("bends an edge before the node it reaches, so that it arrives level", () => {
    const { edges } = layoutJourney([leaf("page"), leaf("form"), leaf("price")], [edge("a", "page", "price"), edge("b", "form", "price")])

    expect(edges.map(({ points }) => points[points.length - HALF].y === points[points.length - 1].y)).toStrictEqual([true, true])
    expect(edges.map(({ points }) => points[points.length - 1].x - points[points.length - HALF].x)).toStrictEqual([EDGE_APPROACH, EDGE_APPROACH])
  })

  it("spaces the edges that reach the same head, in the order they come from, around the middle of the head", () => {
    const { nodes, edges } = layoutJourney([leaf("page"), leaf("form"), leaf("price")], [edge("a", "form", "price"), edge("b", "page", "price")])
    const [page, form, price] = nodes
    const endOf = (id: string): number => {
      const points = edges.find((placed) => placed.id === id)?.points ?? []
      return points[points.length - 1].y
    }

    expect(page.y).toBeLessThan(form.y)
    expect(endOf("a") - endOf("b")).toBe(EDGE_SPACING)
    expect((endOf("a") + endOf("b")) / HALF).toBe(price.y + NODE_HEAD_HEIGHT / HALF)
  })

  it("keeps the edges that reach the same row inside that row", () => {
    const sources = ["a", "b", "c", "d", "e", "f"]
    const { rows, edges } = layoutJourney([...sources.map((id) => leaf(id)), leaf("store", ["items"])], sources.map((id) => edge(id, id, "store", { toRowId: "items" })))
    const items = rows[0]
    const ends = edges.map(({ points }) => points[points.length - 1].y)

    expect(new Set(ends).size).toBe(sources.length)
    expect(Math.min(...ends)).toBeGreaterThan(items.y)
    expect(Math.max(...ends)).toBeLessThan(items.y + items.height)
  })

  it("gives the board the height of a lane below its nodes", () => {
    const { height, edges } = layoutJourney([leaf("page"), leaf("price"), leaf("tax")], [edge("a", "page", "price"), edge("b", "price", "tax"), edge("c", "page", "tax")])

    expect(height).toBeGreaterThan(Math.max(...edges.flatMap((placed) => placed.points.map((point) => point.y))))
  })

  it("places two nodes that lead to each other, each once", () => {
    const { nodes } = layoutJourney([leaf("a"), leaf("b")], [edge("ab", "a", "b"), edge("ba", "b", "a")])

    expect(nodes.map((node) => node.id).sort()).toStrictEqual(["a", "b"])
  })
})
