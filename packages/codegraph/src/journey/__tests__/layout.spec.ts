import { createComponentReturn, createDeclarationNode } from "@/__tests__/review-fixture"
import { layoutJourney } from "@/journey/layout"
import type { JourneyEdge, JourneyFlow } from "@flightplan/configurations"

const flow: JourneyFlow = {
  id: "flow",
  title: "Flow",
  nodes: [
    { kind: "entry-point", id: "click", trigger: "user-action", label: "Click", description: null, traceEnd: null },
    createDeclarationNode("route"),
    createDeclarationNode("price", { changeType: "diff" }),
  ],
  edges: [
    { from: "click", to: "route", kind: "trigger", certainty: "proven", through: [] },
    { from: "route", to: "price", kind: "value", certainty: "assumed", through: [] },
  ],
}

describe("layoutJourney", () => {
  it("places the nodes left to right in the order the code runs, inside the board", () => {
    const layout = layoutJourney(flow)
    const [click, route, price] = layout.nodes

    expect(click.x + click.width).toBeLessThan(route.x)
    expect(route.x + route.width).toBeLessThan(price.x)
    expect(price.x + price.width).toBeLessThanOrEqual(layout.width)
    expect(price.y + price.height).toBeLessThanOrEqual(layout.height)
  })

  it("routes each edge from its left node to its right node", () => {
    const [trigger, value] = layoutJourney(flow).edges

    expect(trigger.points.length).toBeGreaterThan(1)
    expect(value.points[0].x).toBeLessThan(value.points[value.points.length - 1].x)
  })
})

const edgeBetween = (from: string, to: string, kind: JourneyEdge["kind"] = "call"): JourneyEdge => ({ from, to, kind, certainty: "proven", through: [] })

const ordersFlow: JourneyFlow = {
  id: "orders",
  title: "Orders",
  nodes: [
    { kind: "entry-point", id: "visit", trigger: "page-visit", label: "A shopper opens /orders", description: null, traceEnd: null },
    { kind: "entry-point", id: "click", trigger: "user-action", label: "A shopper clicks All", description: null, traceEnd: null },
    createDeclarationNode("OrdersPage", { category: "ui", changeType: "diff", data: [{ name: "orders", changeType: "diff", reference: [15, 15] }] }),
    createDeclarationNode("OrderStatusFilter", {
      category: "ui",
      changeType: "diff",
      events: [{ name: "Button.onClick", changeType: "diff", reference: [12, 14], nodeId: "OrderStatusFilter:onClick@12" }],
    }),
    createDeclarationNode("OrderStatusFilter:onClick@12", { category: "event", declaration: "OrderStatusFilter.onClick", changeType: "diff" }),
    createDeclarationNode("useOrderFilterStore", { category: "data", changeType: "diff" }),
  ],
  edges: [
    edgeBetween("visit", "OrdersPage", "trigger"),
    edgeBetween("click", "OrderStatusFilter:onClick@12", "trigger"),
    edgeBetween("OrdersPage", "OrderStatusFilter"),
    edgeBetween("OrderStatusFilter:onClick@12", "useOrderFilterStore", "value"),
    edgeBetween("OrdersPage", "useOrderFilterStore"),
  ],
}

const HALF = 2

describe("layoutJourney with components", () => {
  it("draws every component of a page in one card: a child inside its parent, under a header with its name, with its own frame inside", () => {
    const { cards } = layoutJourney(ordersFlow)
    const [page, filter, filterBody] = cards[0].frames

    expect(cards).toHaveLength(1)
    expect(cards[0].frames.map((frame) => [frame.role, frame.name, frame.depth])).toStrictEqual([
      ["component", "OrdersPage", 0],
      ["group", "OrderStatusFilter", 1],
      ["return", "OrderStatusFilter", 2],
    ])
    expect(filterBody).toMatchObject({ node: { id: "OrderStatusFilter" }, componentReturn: null })
    expect(filterBody.y).toBeGreaterThan(filter.y)
    expect(filterBody.y + filterBody.height).toBeLessThan(filter.y + filter.height)
    expect(filter.x).toBeGreaterThan(page.x)
    expect(filter.y).toBeGreaterThan(page.y)
    expect(filter.x + filter.width).toBeLessThan(page.x + page.width)
    expect(filter.y + filter.height).toBeLessThan(page.y + page.height)
    expect(page.y + page.height).toBeLessThan(cards[0].y + cards[0].height)
  })

  it("puts a user action inside the frame of its component, as a trigger named after the event that catches it", () => {
    const { cards, nodes } = layoutJourney(ordersFlow)
    const [, filter] = cards[0].frames
    const [trigger] = cards[0].triggers

    expect(cards[0].triggers.map(({ entryPoint, eventNodeId, sublabel }) => [entryPoint.label, eventNodeId, sublabel])).toStrictEqual([
      ["A shopper clicks All", "OrderStatusFilter:onClick@12", "Button.onClick :12"],
    ])
    expect(trigger.y).toBeGreaterThan(filter.y)
    expect(trigger.y + trigger.height).toBeLessThan(filter.y + filter.height)
    expect(nodes.filter((placed) => placed.isInsideCard).map((placed) => placed.node.id)).toStrictEqual(["click", "OrdersPage", "OrderStatusFilter"])
  })

  it("starts the line to an event node at the row of its trigger, on the right edge of the card", () => {
    const { cards, edges } = layoutJourney(ordersFlow)
    const [card] = cards
    const [trigger] = card.triggers
    const line = edges.find((placed) => placed.edge.from === "click")

    expect(line?.points[0]).toStrictEqual({ x: card.x + card.width, y: trigger.y + trigger.height / HALF })
  })

  it("ends the line of a page visit at the row of the component it opens, and leaves a render between two components undrawn", () => {
    const { cards, edges, lineInKeys, lineOutKeys } = layoutJourney(ordersFlow)
    const [card] = cards
    const [page] = card.frames
    const visit = edges.find((placed) => placed.edge.from === "visit")
    const render = edges.find((placed) => placed.edge.to === "OrderStatusFilter")

    expect(visit?.points.slice(-1)).toStrictEqual([{ x: card.x, y: page.y + 16 }])
    expect(render).toMatchObject({ isInsideCard: true, points: [] })
    expect(lineInKeys.has(page.key)).toBe(true)
    expect(lineOutKeys.has(page.key)).toBe(true)
  })

  it("draws a component rendered by two pages inside the card of each, with a line from each", () => {
    const shared: JourneyFlow = {
      id: "shared",
      title: "Shared",
      nodes: [
        createDeclarationNode("CatalogPage", { category: "ui" }),
        createDeclarationNode("WishlistPage", { category: "ui" }),
        createDeclarationNode("ProductCard", { category: "ui" }),
        createDeclarationNode("formatPrice", { changeType: "diff" }),
      ],
      edges: [edgeBetween("CatalogPage", "ProductCard"), edgeBetween("WishlistPage", "ProductCard"), edgeBetween("ProductCard", "formatPrice")],
    }

    const { cards, edges } = layoutJourney(shared)

    expect(cards.map((card) => card.frames.map((frame) => frame.name))).toStrictEqual([
      ["CatalogPage", "ProductCard", "ProductCard"],
      ["WishlistPage", "ProductCard", "ProductCard"],
    ])
    expect(edges.filter((placed) => placed.edge.to === "formatPrice").map((placed) => placed.id)).toStrictEqual([
      "ProductCard>formatPrice:call",
      "ProductCard>formatPrice:call#1",
    ])
  })

  it("gives the handler of a component that is not on the diagram a card of its own, so its trigger has a row", () => {
    const lone: JourneyFlow = {
      id: "lone",
      title: "Lone",
      nodes: [
        { kind: "entry-point", id: "click", trigger: "user-action", label: "A user clicks Add to cart", description: null, traceEnd: null },
        createDeclarationNode("AddToCartButton:onClick@7", { category: "event", declaration: "AddToCartButton.onClick" }),
        createDeclarationNode("useCartStore", { changeType: "diff" }),
      ],
      edges: [edgeBetween("click", "AddToCartButton:onClick@7", "trigger"), edgeBetween("AddToCartButton:onClick@7", "useCartStore", "value")],
    }

    const { cards } = layoutJourney(lone)

    expect(cards[0].frames.map((frame) => [frame.name, frame.node])).toStrictEqual([["AddToCartButton", null]])
    expect(cards[0].triggers.map((trigger) => [trigger.entryPoint.label, trigger.sublabel])).toStrictEqual([["A user clicks Add to cart", "onClick :7"]])
  })
})

const returningFlow: JourneyFlow = {
  id: "returning",
  title: "Returning",
  nodes: [
    { kind: "entry-point", id: "visit", trigger: "page-visit", label: "A shopper opens /orders", description: null, traceEnd: null },
    { kind: "entry-point", id: "click", trigger: "user-action", label: "A shopper clicks All", description: null, traceEnd: null },
    createDeclarationNode("OrdersPage", {
      category: "ui",
      declaration: "OrdersPage",
      path: "src/routes/orders/index.tsx",
      changeType: "diff",
      data: [
        { name: "orders", changeType: "diff", reference: [15, 15] },
        { name: "retry", changeType: "none", reference: [10, 10] },
      ],
      returns: [
        createComponentReturn("OrdersPage#return@9", { statement: "if (isPending) return", reference: [9, 9], changeType: "diff", isAdded: true }),
        createComponentReturn("OrdersPage#return@10", { statement: "if (isError) return", reference: [10, 10] }),
        createComponentReturn("OrdersPage#return@11", {
          reference: [11, 25],
          changeType: "diff",
          label: "Renders the orders of the chosen status",
          renderedNodeIds: ["OrderStatusFilter", "OrderRow"],
        }),
      ],
    }),
    createDeclarationNode("OrderStatusFilter", {
      category: "ui",
      declaration: "OrderStatusFilter",
      changeType: "diff",
      events: [{ name: "Button.onClick", changeType: "diff", reference: [12, 14], nodeId: "OrderStatusFilter:onClick@12" }],
    }),
    createDeclarationNode("OrderRow", {
      category: "ui",
      declaration: "OrderRow",
      path: "src/components/order-row.tsx",
      changeType: "diff",
      data: [{ name: "order", changeType: "diff", reference: [9, 9] }],
      states: [],
      dataFetches: [],
      hooks: [],
      effects: [],
      returns: [
        createComponentReturn("OrderRow#return@8", { statement: "if (order.isCancelled) return", reference: [8, 8] }),
        createComponentReturn("OrderRow#return@9", { reference: [9, 9], changeType: "diff" }),
      ],
    }),
    createDeclarationNode("OrderStatusFilter:onClick@12", { category: "event", declaration: "OrderStatusFilter.onClick", changeType: "diff" }),
    createDeclarationNode("useOrders", { changeType: "diff" }),
  ],
  edges: [
    edgeBetween("visit", "OrdersPage", "trigger"),
    edgeBetween("click", "OrderStatusFilter:onClick@12", "trigger"),
    edgeBetween("OrdersPage", "OrderStatusFilter"),
    edgeBetween("OrdersPage", "OrderRow"),
    edgeBetween("OrdersPage", "useOrders"),
    edgeBetween("OrderStatusFilter:onClick@12", "useOrders", "value"),
  ],
}

describe("layoutJourney with a component that has several returns", () => {
  it("draws each return of the top-most component as a frame of the card, with the components it renders inside it", () => {
    const { cards } = layoutJourney(returningFlow)

    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ declaration: "OrdersPage", path: "src/routes/orders/index.tsx", headerNode: { id: "OrdersPage" } })
    expect(cards[0].frames.map((frame) => [frame.role, frame.name, frame.depth])).toStrictEqual([
      ["return", "if (isPending) return", 0],
      ["return", "if (isError) return", 0],
      ["return", "Renders the orders of the chosen status", 0],
      ["group", "OrderStatusFilter", 1],
      ["return", "OrderStatusFilter", 2],
      ["group", "OrderRow", 1],
      ["return", "if (order.isCancelled) return", 2],
      ["return", "return", 2],
    ])
  })

  it("stacks the returns in source order and keeps a nested component inside the return that renders it", () => {
    const { cards } = layoutJourney(returningFlow)
    const [pending, failed, listed, filter, , row, cancelled, shown] = cards[0].frames

    expect(pending.y + pending.height).toBeLessThan(failed.y)
    expect(failed.y + failed.height).toBeLessThan(listed.y)
    expect(filter.y).toBeGreaterThan(listed.y)
    expect(row.y + row.height).toBeLessThan(listed.y + listed.height)
    expect(cancelled.y).toBeGreaterThan(row.y)
    expect(shown.y + shown.height).toBeLessThan(row.y + row.height)
    expect(shown.x + shown.width).toBeLessThan(row.x + row.width)
  })

  it("lists on a return the data read on its lines, every name on a changed return and only the changed ones on another", () => {
    const { cards } = layoutJourney(returningFlow)

    expect(cards[0].frames.map((frame) => frame.data.map((entry) => entry.name))).toStrictEqual([[], [], ["orders"], [], [], [], [], ["order"]])
  })

  it("puts a user action inside the return that renders its component", () => {
    const { cards } = layoutJourney(returningFlow)
    const [, , listed, filter] = cards[0].frames
    const [trigger] = cards[0].triggers

    expect(trigger.y).toBeGreaterThan(filter.y)
    expect(trigger.y + trigger.height).toBeLessThan(listed.y + listed.height)
  })

  it("attaches the lines of the top-most component at the header of the card", () => {
    const { cards, edges, nodes, lineInKeys, lineOutKeys } = layoutJourney(returningFlow)
    const [card] = cards
    const visit = edges.find((placed) => placed.edge.from === "visit")
    const call = edges.find((placed) => placed.edge.from === "OrdersPage" && placed.edge.to === "useOrders")
    const page = nodes.find((placed) => placed.node.id === "OrdersPage")

    expect(visit?.points.slice(-1)).toStrictEqual([{ x: card.x, y: card.y + 16 }])
    expect(call?.points[0]).toStrictEqual({ x: card.x + card.width, y: card.y + 16 })
    expect(lineInKeys.has(card.id)).toBe(true)
    expect(lineOutKeys.has(card.id)).toBe(true)
    expect(page).toMatchObject({ isInsideCard: true, x: card.x, y: card.y, width: card.width, height: 32 })
  })

  it("gives a nested component with several returns a frame of its own that holds them, and no port to its returns", () => {
    const { cards, nodes } = layoutJourney(returningFlow)
    const row = cards[0].frames.find((frame) => frame.role === "group" && frame.name === "OrderRow")
    const placed = nodes.find((candidate) => candidate.node.id === "OrderRow")

    expect(row).toMatchObject({ node: { id: "OrderRow" }, componentReturn: null, data: [] })
    expect(placed).toMatchObject({ isInsideCard: true, x: row?.x, y: row?.y })
  })
})

describe("the states, hooks and effects of a component on its card", () => {
  const hooks = [
    { name: "useOrders", changeType: "related" as const, reference: [8, 8] as [number, number] },
    { name: "useOrders", changeType: "diff" as const, reference: [9, 9] as [number, number] },
  ]
  const flowOf = (overrides: Parameters<typeof createDeclarationNode>[1]): JourneyFlow => ({
    id: "parts",
    title: "Parts",
    nodes: [createDeclarationNode("OrdersPage", { category: "ui", changeType: "diff", ...overrides })],
    edges: [],
  })

  const states = [
    { name: "status", changeType: "related" as const, reference: [6, 6] as [number, number] },
    { name: "status", changeType: "diff" as const, reference: [7, 7] as [number, number] },
  ]
  const effects = [{ name: "useEffect", changeType: "related" as const, reference: [10, 12] as [number, number], nodeId: null }]
  const dataFetches = [{ name: "useProducts", changeType: "related" as const, reference: [13, 13] as [number, number], nodeId: null }]

  it("lists the state as a line of the frame, each name once with its strongest change", () => {
    const [frame] = layoutJourney(flowOf({ states })).cards[0].frames

    expect(frame.parts).toStrictEqual([{ kind: "state", names: [{ name: "status", changeType: "diff", reference: [7, 7] }] }])
  })

  it("makes room for the state line above the data of the frame", () => {
    const data = [{ name: "orders", changeType: "diff" as const, reference: [15, 15] as [number, number] }]
    const [plain] = layoutJourney(flowOf({ data })).cards[0].frames
    const [withState] = layoutJourney(flowOf({ data, states })).cards[0].frames

    expect(withState.height - plain.height).toBe(30)
  })

  it("gives every data fetch, hook and effect a row of its own, the data fetches first, then the hooks, then the effects", () => {
    const [card] = layoutJourney(flowOf({ hooks, effects, dataFetches })).cards

    expect(card.rows.map(({ kind, name, line, changeType, ownerNodeId }) => [kind, name, line, changeType, ownerNodeId])).toStrictEqual([
      ["data-fetch", "useProducts", 13, "related", "OrdersPage"],
      ["hook", "useOrders", 8, "related", "OrdersPage"],
      ["hook", "useOrders", 9, "diff", "OrdersPage"],
      ["effect", "useEffect", 10, "related", "OrdersPage"],
    ])
  })

  it("stacks the rows under the data of the frame and above its user actions, each as high as a user action", () => {
    const data = [{ name: "orders", changeType: "diff" as const, reference: [15, 15] as [number, number] }]
    const [plain] = layoutJourney(flowOf({ data })).cards[0].frames
    const [card] = layoutJourney(flowOf({ data, effects, dataFetches })).cards
    const [first, second] = card.rows

    expect(card.frames[0].height - plain.height).toBe(104)
    expect(first.y).toBeGreaterThan(card.frames[0].y + 32)
    expect(second.y - first.y).toBe(52)
    expect([first.height, first.width]).toStrictEqual([44, card.frames[0].width - 20])
  })

  it("gives the top-most component with several returns a frame of its own under the header of the card, to hold the lines", () => {
    const returns = [createComponentReturn("OrdersPage#return@9", { reference: [9, 9] }), createComponentReturn("OrdersPage#return@11", { reference: [11, 12] })]
    const [headed] = layoutJourney(flowOf({ returns })).cards
    const [framed] = layoutJourney(flowOf({ returns, hooks })).cards

    expect(headed.frames.map((frame) => frame.role)).toStrictEqual(["return", "return"])
    expect(framed.frames.map((frame) => frame.role)).toStrictEqual(["group", "return", "return"])
    expect(framed.rows.map((row) => row.name)).toStrictEqual(["useOrders", "useOrders"])
    expect(framed.headerNode).toBeNull()
  })
})
