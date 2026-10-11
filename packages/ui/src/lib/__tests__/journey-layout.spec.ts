import { layoutJourney, NODE_HEAD_HEIGHT, NODE_WIDTH, ROW_HEADING_HEIGHT, ROW_HEIGHT, type LayoutEdge, type LayoutNode } from "@/lib/journey-layout"

const leaf = (id: string, rowIds: readonly string[] = []): LayoutNode => ({ id, rows: rowIds.map((rowId) => ({ id: rowId, kind: "row" })), children: [] })

const edge = (id: string, from: string, to: string, rowIds: Partial<Pick<LayoutEdge, "fromRowId" | "toRowId">> = {}): LayoutEdge => ({ id, from, to, fromRowId: null, toRowId: null, ...rowIds })

const HALF = 2

describe("layoutJourney", () => {
  it("places a node one column after the node that leads to it, level with it", () => {
    const { nodes, edges } = layoutJourney([leaf("page"), leaf("price")], [edge("a", "page", "price")])
    const [page, price] = nodes

    expect(price.x).toBeGreaterThan(page.x + page.width)
    expect(price.y).toBe(page.y)
    expect(edges).toStrictEqual([
      { ...edge("a", "page", "price"), points: [{ x: page.x + page.width, y: page.y + NODE_HEAD_HEIGHT / HALF }, { x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }], fromRowPoints: null, toRowPoints: null },
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

    expect(edges[0].points).toStrictEqual([{ x: page.x + page.width, y: list.y + NODE_HEAD_HEIGHT / HALF }, { x: load.x, y: load.y + NODE_HEAD_HEIGHT / HALF }])
  })

  it("joins an edge to the row it leaves and to the row it reaches, level with each, through the edge of the outer node", () => {
    const card: LayoutNode = { ...leaf("page"), children: [leaf("form", ["apply"])] }
    const { nodes, rows, edges } = layoutJourney([card, leaf("store", ["items"])], [edge("a", "form", "store", { fromRowId: "apply", toRowId: "items" })])
    const [page, , store] = nodes
    const [apply, items] = rows
    const leaving = { x: page.x + page.width, y: apply.y + apply.height / HALF }
    const reaching = { x: store.x, y: items.y + items.height / HALF }

    expect(edges[0].points).toStrictEqual([leaving, reaching])
    expect(edges[0].fromRowPoints).toStrictEqual([{ x: apply.x + apply.width, y: leaving.y }, leaving])
    expect(edges[0].toRowPoints).toStrictEqual([reaching, { x: items.x, y: reaching.y }])
  })

  it("joins an edge to the head of a node when the row it names is not drawn", () => {
    const { nodes, edges } = layoutJourney([leaf("page"), leaf("price")], [edge("a", "page", "price", { fromRowId: "gone", toRowId: "gone-too" })])
    const [page, price] = nodes

    expect(edges[0].points).toStrictEqual([{ x: page.x + page.width, y: page.y + NODE_HEAD_HEIGHT / HALF }, { x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }])
    expect([edges[0].fromRowPoints, edges[0].toRowPoints]).toStrictEqual([null, null])
  })

  it("gives the board the size of what is on it, and a leaf the width of a node", () => {
    const { width, height, nodes } = layoutJourney([leaf("page")], [])

    expect(nodes[0].width).toBe(NODE_WIDTH)
    expect(width).toBeGreaterThan(nodes[0].x + nodes[0].width)
    expect(height).toBeGreaterThan(nodes[0].y + nodes[0].height)
  })

  it("places two nodes that lead to each other, each once", () => {
    const { nodes } = layoutJourney([leaf("a"), leaf("b")], [edge("ab", "a", "b"), edge("ba", "b", "a")])

    expect(nodes.map((node) => node.id).sort()).toStrictEqual(["a", "b"])
  })
})
