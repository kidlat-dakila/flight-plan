import { ARGUMENT_ROW_HEIGHT, CALLEE_HEAD_HEIGHT, CALLEE_INSET, EDGE_APPROACH, EDGE_SPACING, layoutTrace, MARGIN, NODE_GAP, NODE_HEAD_HEIGHT, NODE_WIDTH, ROW_HEADING_HEIGHT, ROW_HEIGHT, SITE_ROW_HEIGHT, TWO_LINE_ROW_HEIGHT, type LayoutEdge, type LayoutNode } from "@/lib/trace-layout"

const leaf = (id: string, rowIds: readonly string[] = []): LayoutNode => ({ id, rows: rowIds.map((rowId) => ({ id: rowId, kind: "row" })), children: [] })

const edge = (id: string, from: string, to: string, rowIds: Partial<Pick<LayoutEdge, "fromRowId" | "toRowId">> = {}): LayoutEdge => ({ id, from, to, fromRowId: null, toRowId: null, ...rowIds })

const HALF = 2

const approachTo = ({ x, y }: { readonly x: number, readonly y: number }): { x: number, y: number } => ({ x: x - EDGE_APPROACH, y })

describe("layoutTrace", () => {
  it("places a node one column after the node that leads to it, level with it", () => {
    const { nodes, edges } = layoutTrace([leaf("page"), leaf("price")], [edge("a", "page", "price")])
    const [page, price] = nodes

    expect(price.x).toBeGreaterThan(page.x + page.width)
    expect(price.y).toBe(page.y)
    expect(edges).toStrictEqual([
      { ...edge("a", "page", "price"), points: [{ x: page.x + page.width, y: page.y + NODE_HEAD_HEIGHT / HALF }, approachTo({ x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }), { x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }], fromRowPoints: null, toRowPoints: null },
    ])
  })

  it("stacks the nodes of one column without overlap", () => {
    const { nodes } = layoutTrace([leaf("page"), leaf("price"), leaf("tax")], [edge("a", "page", "price"), edge("b", "page", "tax")])
    const [, price, tax] = nodes

    expect(tax.x).toBe(price.x)
    expect(tax.y).toBeGreaterThanOrEqual(price.y + price.height)
  })

  it("centres the nodes of one column that reach for the same height on it, and keeps the highest node at the margin", () => {
    const { nodes } = layoutTrace([leaf("page"), leaf("price"), leaf("tax"), leaf("total")], [edge("a", "page", "price"), edge("b", "page", "tax"), edge("c", "page", "total")])
    const [page, price, tax, total] = nodes
    const headCentre = ({ y }: { readonly y: number }): number => y + NODE_HEAD_HEIGHT / HALF

    expect(headCentre(tax)).toBe(headCentre(page))
    expect(page.y - price.y).toBe(total.y - page.y)
    expect(Math.min(...nodes.map(({ y }) => y))).toBe(MARGIN)
  })

  it("centres each run of overlapping nodes on its own, and leaves a node with room where it reaches for", () => {
    const tall = leaf("tall", ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"])
    const { nodes, rows } = layoutTrace(
      [tall, leaf("first"), leaf("second"), leaf("last")],
      [edge("a", "tall", "first", { fromRowId: "a" }), edge("b", "tall", "second", { fromRowId: "b" }), edge("l", "tall", "last", { fromRowId: "l" })],
    )
    const [, first, second, last] = nodes
    const lastRow = rows.find((row) => row.id === "l")

    expect(second.y - first.y).toBe(first.height + NODE_GAP)
    expect(last.y).toBeGreaterThan(second.y + second.height + NODE_GAP)
    expect(last.y + NODE_HEAD_HEIGHT / HALF).toBe((lastRow?.y ?? 0) + (lastRow?.height ?? 0) / HALF)
  })

  it("draws the children of a node inside it, below its rows, and draws no edge between the two", () => {
    const card: LayoutNode = { ...leaf("page", ["click"]), children: [leaf("list")] }
    const { nodes, rows, edges } = layoutTrace([card], [edge("a", "page", "list")])
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

  it("places a child card where its card row is, under its heading and above the rows after it", () => {
    const card: LayoutNode = {
      id: "store",
      rows: [{ id: "methods", kind: "heading" }, { id: "add", kind: "card" }, { id: "after", kind: "row" }],
      children: [leaf("add"), leaf("extending")],
    }
    const { nodes: [store, add, extending], rows: [methods, after] } = layoutTrace([card], [])

    expect(add.y).toBeGreaterThanOrEqual(methods.y + methods.height)
    expect(after.y).toBeGreaterThanOrEqual(add.y + add.height)
    expect(extending.y).toBeGreaterThanOrEqual(after.y + after.height)
    expect(extending.y + extending.height).toBeLessThanOrEqual(store.y + store.height)
  })

  it("places a heading above the rows it titles, lower than a row, and each row below the last", () => {
    const card: LayoutNode = { id: "page", rows: [{ id: "state", kind: "heading" }, { id: "held", kind: "row" }, { id: "total", kind: "row" }], children: [] }
    const { nodes: [page], rows: [heading, held, total] } = layoutTrace([card], [])

    expect([heading.kind, heading.height, held.height]).toStrictEqual(["heading", ROW_HEADING_HEIGHT, ROW_HEIGHT])
    expect(heading.y).toBeGreaterThanOrEqual(page.y + NODE_HEAD_HEIGHT)
    expect(held.y).toBeGreaterThanOrEqual(heading.y + heading.height)
    expect(total.y).toBeGreaterThanOrEqual(held.y + held.height)
    expect(total.y + total.height).toBeLessThanOrEqual(page.y + page.height)
  })

  it("ends an edge that leaves a node inside another at the edge of the outer one, level with the inner one", () => {
    const card: LayoutNode = { ...leaf("page"), children: [leaf("list")] }
    const { nodes, edges } = layoutTrace([card, leaf("load")], [edge("a", "list", "load")])
    const [page, list, load] = nodes

    const reaching = { x: load.x, y: load.y + NODE_HEAD_HEIGHT / HALF }

    expect(edges[0].points).toStrictEqual([{ x: page.x + page.width, y: list.y + NODE_HEAD_HEIGHT / HALF }, approachTo(reaching), reaching])
  })

  it("gives a row of two lines more height than a row of one, and places the next row below it", () => {
    const card: LayoutNode = { id: "page", rows: [{ id: "click", kind: "two-line-row" }, { id: "held", kind: "row" }], children: [] }
    const { nodes: [page], rows: [click, held] } = layoutTrace([card], [])

    expect([click.height, held.height]).toStrictEqual([TWO_LINE_ROW_HEIGHT, ROW_HEIGHT])
    expect(TWO_LINE_ROW_HEIGHT).toBeGreaterThan(ROW_HEIGHT)
    expect(held.y).toBeGreaterThanOrEqual(click.y + click.height)
    expect(held.y + held.height).toBeLessThanOrEqual(page.y + page.height)
  })

  it("places the rows of a callee card inside its frame, below its head, and grows the node by the whole card", () => {
    const card: LayoutNode = {
      id: "rename",
      rows: [
        { id: "trainer-id", kind: "argument-row" },
        { id: "load", kind: "callee", rows: [{ id: "first-load", kind: "site-row" }, { id: "second-load", kind: "row" }] },
        { id: "returned", kind: "site-row" },
      ],
      children: [],
    }
    const plain: LayoutNode = { ...card, rows: [card.rows[0], card.rows[2]] }
    const { nodes: [rename], rows: [argument, load, firstLoad, secondLoad, returned] } = layoutTrace([card], [])
    const { nodes: [withoutCallee] } = layoutTrace([plain], [])

    expect([argument.height, firstLoad.height, secondLoad.height, returned.height]).toStrictEqual([ARGUMENT_ROW_HEIGHT, SITE_ROW_HEIGHT, ROW_HEIGHT, SITE_ROW_HEIGHT])
    expect([load.kind, firstLoad.x, firstLoad.width, firstLoad.y]).toStrictEqual(["callee", load.x + CALLEE_INSET, load.width - CALLEE_INSET * HALF, load.y + CALLEE_HEAD_HEIGHT])
    expect(secondLoad.y).toBeGreaterThan(firstLoad.y + firstLoad.height)
    expect(load.y + load.height).toBe(secondLoad.y + secondLoad.height + CALLEE_INSET)
    expect(returned.y).toBeGreaterThan(load.y + load.height)
    expect(rename.height - withoutCallee.height).toBeGreaterThanOrEqual(load.height)
  })

  it("leaves an edge from a call row inside a callee card at the edge of its node, level with that row", () => {
    const card: LayoutNode = { id: "rename", rows: [{ id: "load", kind: "callee", rows: [{ id: "first-load", kind: "site-row" }, { id: "second-load", kind: "site-row" }] }], children: [] }
    const { nodes: [rename], rows: [, , secondLoad], edges } = layoutTrace([card, leaf("store")], [edge("a", "rename", "store", { fromRowId: "second-load" })])
    const leaving = { x: rename.x + rename.width, y: secondLoad.y + secondLoad.height / HALF }

    expect(edges[0].points[0]).toStrictEqual(leaving)
    expect(edges[0].fromRowPoints).toStrictEqual([{ x: secondLoad.x + secondLoad.width, y: leaving.y }, leaving])
  })

  it("joins an edge to the row it leaves and to the row it reaches, level with each, through the edge of the outer node", () => {
    const card: LayoutNode = { ...leaf("page"), children: [leaf("form", ["apply"])] }
    const { nodes, rows, edges } = layoutTrace([card, leaf("store", ["items"])], [edge("a", "form", "store", { fromRowId: "apply", toRowId: "items" })])
    const [page, , store] = nodes
    const [apply, items] = rows
    const leaving = { x: page.x + page.width, y: apply.y + apply.height / HALF }
    const reaching = { x: store.x, y: items.y + items.height / HALF }

    expect(edges[0].points).toStrictEqual([leaving, approachTo(reaching), reaching])
    expect(edges[0].fromRowPoints).toStrictEqual([{ x: apply.x + apply.width, y: leaving.y }, leaving])
    expect(edges[0].toRowPoints).toStrictEqual([reaching, { x: items.x, y: reaching.y }])
  })

  it("joins an edge to the head of a node when the row it names is not drawn", () => {
    const { nodes, edges } = layoutTrace([leaf("page"), leaf("price")], [edge("a", "page", "price", { fromRowId: "gone", toRowId: "gone-too" })])
    const [page, price] = nodes

    const reaching = { x: price.x, y: price.y + NODE_HEAD_HEIGHT / HALF }

    expect(edges[0].points).toStrictEqual([{ x: page.x + page.width, y: page.y + NODE_HEAD_HEIGHT / HALF }, approachTo(reaching), reaching])
    expect([edges[0].fromRowPoints, edges[0].toRowPoints]).toStrictEqual([null, null])
  })

  it("gives the board the size of what is on it, and a leaf the width of a node", () => {
    const { width, height, nodes } = layoutTrace([leaf("page")], [])

    expect(nodes[0].width).toBe(NODE_WIDTH)
    expect(width).toBeGreaterThan(nodes[0].x + nodes[0].width)
    expect(height).toBeGreaterThan(nodes[0].y + nodes[0].height)
  })

  it("draws a card that asks for a width at that width, with its rows and the cards inside it as wide as it lets them be", () => {
    const card: LayoutNode = { ...leaf("page", ["click"]), requestedWidth: 400, children: [leaf("list")] }
    const { nodes: [page, list], rows: [click] } = layoutTrace([card], [])

    expect(page.width).toBe(400)
    expect(click.x + click.width).toBeLessThan(page.x + page.width)
    expect(click.width).toBeGreaterThan(NODE_WIDTH)
    expect(list.width).toBe(click.width)
  })

  it("widens only the card that asks for a width, and starts the next column after it", () => {
    const { nodes, edges } = layoutTrace([leaf("page"), { ...leaf("price"), requestedWidth: 480 }, leaf("tax"), leaf("total")], [edge("a", "page", "price"), edge("b", "page", "tax"), edge("c", "tax", "total")])
    const [, price, tax, total] = nodes

    expect([price.width, tax.width]).toStrictEqual([480, NODE_WIDTH])
    expect(tax.x).toBe(price.x)
    expect(total.x).toBeGreaterThan(price.x + price.width)
    expect(edges.find((placed) => placed.id === "c")?.points[0].x).toBe(tax.x + tax.width)
  })

  it("draws a card that asks for less than the width of a node at the width of a node", () => {
    const { nodes } = layoutTrace([{ ...leaf("page"), requestedWidth: 100 }], [])

    expect(nodes[0].width).toBe(NODE_WIDTH)
  })

  it("places a node level with the row that leads to it", () => {
    const { nodes, rows } = layoutTrace([leaf("page", ["state", "hook", "submit"]), leaf("handler")], [edge("a", "page", "handler", { fromRowId: "submit" })])
    const [, handler] = nodes
    const submit = rows[2]

    expect(handler.y + NODE_HEAD_HEIGHT / HALF).toBe(submit.y + submit.height / HALF)
  })

  it("leads an edge that passes a column through a lane beside the nodes of that column, level across it", () => {
    const { nodes, edges } = layoutTrace([leaf("page"), leaf("price"), leaf("tax")], [edge("a", "page", "price"), edge("b", "price", "tax"), edge("c", "page", "tax")])
    const [page, price, tax] = nodes
    const passing = edges.find((placed) => placed.id === "c")?.points ?? []
    const [start, entering, leaving, approaching, end] = passing

    expect(passing).toHaveLength(5)
    expect([start.x, entering.x, leaving.x, approaching.x, end.x]).toStrictEqual([page.x + page.width, price.x, price.x + price.width, tax.x - EDGE_APPROACH, tax.x])
    expect(entering.y).toBe(leaving.y)
    expect(entering.y < price.y || entering.y > price.y + price.height).toBe(true)
  })

  it("leads the edges that pass a column to the same node through lanes of their own, side by side in the order they come from", () => {
    const { edges } = layoutTrace(
      [leaf("page"), leaf("form"), leaf("price"), leaf("tax")],
      [edge("a", "page", "price"), edge("b", "form", "price"), edge("c", "price", "tax"), edge("e", "form", "tax"), edge("d", "page", "tax")],
    )
    const laneOf = (id: string): number => (edges.find((placed) => placed.id === id)?.points ?? [])[1].y

    expect(laneOf("e") - laneOf("d")).toBe(EDGE_SPACING)
    expect(edges.find((placed) => placed.id === "d")?.points).toHaveLength(5)
  })

  it("keeps the lanes of a column clear of its nodes", () => {
    const { nodes, edges } = layoutTrace(
      [leaf("page"), leaf("form"), leaf("price"), leaf("tax")],
      [edge("a", "page", "price"), edge("b", "form", "price"), edge("c", "price", "tax"), edge("e", "form", "tax"), edge("d", "page", "tax")],
    )
    const price = nodes[2]
    const laneYs = ["d", "e"].map((id) => (edges.find((placed) => placed.id === id)?.points ?? [])[1].y)

    expect(laneYs.every((y) => y < price.y || y > price.y + price.height)).toBe(true)
  })

  it("bends an edge before the node it reaches, so that it arrives level", () => {
    const { edges } = layoutTrace([leaf("page"), leaf("form"), leaf("price")], [edge("a", "page", "price"), edge("b", "form", "price")])

    expect(edges.map(({ points }) => points[points.length - HALF].y === points[points.length - 1].y)).toStrictEqual([true, true])
    expect(edges.map(({ points }) => points[points.length - 1].x - points[points.length - HALF].x)).toStrictEqual([EDGE_APPROACH, EDGE_APPROACH])
  })

  it("spaces the edges that reach the same head, in the order they come from, around the middle of the head", () => {
    const { nodes, edges } = layoutTrace([leaf("page"), leaf("form"), leaf("price")], [edge("a", "form", "price"), edge("b", "page", "price")])
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
    const { rows, edges } = layoutTrace([...sources.map((id) => leaf(id)), leaf("store", ["items"])], sources.map((id) => edge(id, id, "store", { toRowId: "items" })))
    const items = rows[0]
    const ends = edges.map(({ points }) => points[points.length - 1].y)

    expect(new Set(ends).size).toBe(sources.length)
    expect(Math.min(...ends)).toBeGreaterThan(items.y)
    expect(Math.max(...ends)).toBeLessThan(items.y + items.height)
  })

  it("gives the board the height of a lane below its nodes", () => {
    const { height, edges } = layoutTrace([leaf("page"), leaf("price"), leaf("tax")], [edge("a", "page", "price"), edge("b", "price", "tax"), edge("c", "page", "tax")])

    expect(height).toBeGreaterThan(Math.max(...edges.flatMap((placed) => placed.points.map((point) => point.y))))
  })

  it("places two nodes that lead to each other, each once", () => {
    const { nodes } = layoutTrace([leaf("a"), leaf("b")], [edge("ab", "a", "b"), edge("ba", "b", "a")])

    expect(nodes.map((node) => node.id).sort()).toStrictEqual(["a", "b"])
  })

  it("keeps the columns of a path that holds a loop, and of what the loop leads to", () => {
    const { nodes } = layoutTrace(
      [leaf("page"), leaf("form"), leaf("submit"), leaf("save"), leaf("store")],
      [edge("a", "page", "form"), edge("b", "form", "submit"), edge("c", "submit", "form"), edge("d", "submit", "save"), edge("e", "save", "store")],
    )
    const xOf = (id: string): number => nodes.find((node) => node.id === id)?.x ?? 0

    expect(["page", "form", "submit", "save", "store"].map(xOf)).toStrictEqual([...new Set(nodes.map((node) => node.x))].sort((one, two) => one - two))
  })

  it("leads the edge that closes a loop below the nodes it passes, back to the left of the node it reaches", () => {
    const { nodes, edges, height } = layoutTrace([leaf("form"), leaf("submit")], [edge("ab", "form", "submit"), edge("ba", "submit", "form")])
    const [form, submit] = nodes
    const [, back] = edges
    const lowest = Math.max(...back.points.map((point) => point.y))

    expect(back.points[0]).toStrictEqual({ x: submit.x + submit.width, y: submit.y + NODE_HEAD_HEIGHT / HALF })
    expect(back.points[back.points.length - 1].x).toBe(form.x)
    expect(lowest).toBeGreaterThan(Math.max(form.y + form.height, submit.y + submit.height))
    expect(height).toBeGreaterThan(lowest)
    expect(back.points.every((point, index) => index === 0 || point.x === back.points[index - 1].x || point.y === back.points[index - 1].y)).toBe(true)
  })
})
