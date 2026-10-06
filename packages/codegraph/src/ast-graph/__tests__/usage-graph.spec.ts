import { mergeDiagramNodes, ringsOf, usageNodeIdOf } from "@/ast-graph"
import { CHECKOUT_TREE, diagramNode, LOGGER_TREE, PRICE_OF_TREE, usedBy } from "./diagram-nodes"

describe("mergeDiagramNodes", () => {
  it("lists every declaration of a tree once, with an edge from each user to what it uses", () => {
    expect(mergeDiagramNodes([PRICE_OF_TREE])).toStrictEqual({
      nodes: [
        { id: "src/pricing.ts#priceOf", path: "src/pricing.ts", declaration: "priceOf", isChanged: true },
        { id: "src/cart.ts#subtotal", path: "src/cart.ts", declaration: "subtotal", isChanged: false },
        { id: "src/checkout.ts#checkout", path: "src/checkout.ts", declaration: "checkout", isChanged: false },
        { id: "src/ui.ts#CheckoutButton", path: "src/ui.ts", declaration: "CheckoutButton", isChanged: false },
      ],
      edges: [
        { from: "src/cart.ts#subtotal", to: "src/pricing.ts#priceOf", kind: "call" },
        { from: "src/checkout.ts#checkout", to: "src/cart.ts#subtotal", kind: "call" },
        { from: "src/ui.ts#CheckoutButton", to: "src/checkout.ts#checkout", kind: "call" },
      ],
    })
  })

  it("merges a changed declaration into the tree that already reaches it", () => {
    const merged = mergeDiagramNodes([PRICE_OF_TREE, CHECKOUT_TREE])

    expect(merged.nodes.map((node) => [node.declaration, node.isChanged])).toStrictEqual([
      ["priceOf", true],
      ["subtotal", false],
      ["checkout", true],
      ["CheckoutButton", false],
    ])
    expect(merged.edges).toHaveLength(3)
  })

  it("keeps trees that share nothing as separate parts of one graph", () => {
    const merged = mergeDiagramNodes([PRICE_OF_TREE, LOGGER_TREE])

    expect(merged.nodes.map((node) => node.declaration)).toStrictEqual(["priceOf", "subtotal", "checkout", "CheckoutButton", "log"])
    expect(merged.edges).toHaveLength(3)
  })

  it("keeps the kind a use was traced with, and counts a use as a call when it has none", () => {
    const tree = diagramNode("src/reviews.ts", "saveReview", [
      usedBy(diagramNode("src/Button.tsx", "SaveButton"), "value"),
      usedBy(diagramNode("src/page.ts", "save")),
    ])

    expect(mergeDiagramNodes([tree]).edges.map((edge) => edge.kind)).toStrictEqual(["value", "call"])
  })

  it("names a node by its file and its declaration", () => {
    expect(usageNodeIdOf("src/pricing.ts", "Cart.total")).toBe("src/pricing.ts#Cart.total")
  })

  it("gives nothing for no trees", () => {
    expect(mergeDiagramNodes([])).toStrictEqual({ nodes: [], edges: [] })
  })
})

describe("ringsOf", () => {
  it("counts the connections from each declaration to the nearest change", () => {
    const rings = ringsOf(mergeDiagramNodes([PRICE_OF_TREE, CHECKOUT_TREE]))

    expect([...rings]).toStrictEqual([
      ["src/pricing.ts#priceOf", 0],
      ["src/checkout.ts#checkout", 0],
      ["src/cart.ts#subtotal", 1],
      ["src/ui.ts#CheckoutButton", 1],
    ])
  })

  it("ends when two declarations use each other", () => {
    const visit = diagramNode("src/walk.ts", "visit", [usedBy(diagramNode("src/walk.ts", "enter"))])
    const enter = diagramNode("src/walk.ts", "enter", [usedBy(diagramNode("src/walk.ts", "visit"))])

    expect([...ringsOf(mergeDiagramNodes([visit, enter]))]).toStrictEqual([
      ["src/walk.ts#visit", 0],
      ["src/walk.ts#enter", 0],
    ])
  })
})
