import { createDeclarationNode } from "@/__tests__/review-fixture"
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
  it("draws every component of a page as a frame of one card, a child inside its parent", () => {
    const { cards } = layoutJourney(ordersFlow)
    const [page, filter] = cards[0].frames

    expect(cards).toHaveLength(1)
    expect(cards[0].frames.map((frame) => [frame.name, frame.depth])).toStrictEqual([
      ["OrdersPage", 0],
      ["OrderStatusFilter", 1],
    ])
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

    expect(cards.map((card) => card.frames.map((frame) => frame.name))).toStrictEqual([["CatalogPage", "ProductCard"], ["WishlistPage", "ProductCard"]])
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
