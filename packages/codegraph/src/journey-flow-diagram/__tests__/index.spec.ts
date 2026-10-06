import { CHECKOUT_TREE, diagramNode, LOGGER_TREE, PRICE_OF_TREE, usedBy } from "@/ast-graph/__tests__/diagram-nodes"
import { generateJourneyFlowDiagram } from "@/journey-flow-diagram"

describe("generateJourneyFlowDiagram", () => {
  it("turns a tree into a flow from a new entry point node down to the change", () => {
    expect(generateJourneyFlowDiagram([PRICE_OF_TREE])).toStrictEqual({
      id: "journey:src/pricing.ts#priceOf",
      title: "priceOf",
      nodes: [
        { kind: "entry-point", id: "entry:src/ui.ts#CheckoutButton", label: "CheckoutButton", description: null },
        { kind: "declaration", id: "src/pricing.ts#priceOf", path: "src/pricing.ts", declaration: "priceOf", isChanged: true, category: "logic", label: null, description: null },
        { kind: "declaration", id: "src/cart.ts#subtotal", path: "src/cart.ts", declaration: "subtotal", isChanged: false, category: "logic", label: null, description: null },
        { kind: "declaration", id: "src/checkout.ts#checkout", path: "src/checkout.ts", declaration: "checkout", isChanged: false, category: "logic", label: null, description: null },
        { kind: "declaration", id: "src/ui.ts#CheckoutButton", path: "src/ui.ts", declaration: "CheckoutButton", isChanged: false, category: "logic", label: null, description: null },
      ],
      edges: [
        { from: "entry:src/ui.ts#CheckoutButton", to: "src/ui.ts#CheckoutButton", kind: "trigger", certainty: "proven" },
        { from: "src/cart.ts#subtotal", to: "src/pricing.ts#priceOf", kind: "call", certainty: "proven" },
        { from: "src/checkout.ts#checkout", to: "src/cart.ts#subtotal", kind: "call", certainty: "proven" },
        { from: "src/ui.ts#CheckoutButton", to: "src/checkout.ts#checkout", kind: "call", certainty: "proven" },
      ],
    })
  })

  it("merges two changes on one chain into one path with two head nodes", () => {
    const flow = generateJourneyFlowDiagram([PRICE_OF_TREE, CHECKOUT_TREE])
    const heads = flow?.nodes.filter((node) => node.kind === "declaration" && node.isChanged).map((node) => node.id)

    expect(flow?.title).toBe("priceOf, checkout")
    expect(heads).toStrictEqual(["src/pricing.ts#priceOf", "src/checkout.ts#checkout"])
    expect(flow?.nodes).toHaveLength(5)
    expect(flow?.edges).toHaveLength(4)
  })

  it("gives every declaration nothing uses its own entry point node", () => {
    const tree = diagramNode("src/pricing.ts", "priceOf", [
      usedBy(diagramNode("src/cart.ts", "subtotal")),
      usedBy(diagramNode("src/report.ts", "exportReport")),
    ])
    const entries = generateJourneyFlowDiagram([tree, LOGGER_TREE])?.nodes.filter((node) => node.kind === "entry-point")

    expect(entries?.map((node) => node.id)).toStrictEqual(["entry:src/cart.ts#subtotal", "entry:src/report.ts#exportReport", "entry:src/logger.ts#log"])
  })

  it("draws a function handed over as a value with a value edge", () => {
    const tree = diagramNode("src/reviews.ts", "saveReview", [usedBy(diagramNode("src/Button.tsx", "SaveButton"), "value")])

    expect(generateJourneyFlowDiagram([tree])?.edges.map((edge) => edge.kind)).toStrictEqual(["trigger", "value"])
  })

  it("shortens the title of a flow with many changes", () => {
    const trees = ["first", "second", "third", "fourth", "fifth"].map((name) => diagramNode("src/steps.ts", name))

    expect(generateJourneyFlowDiagram(trees)?.title).toBe("first, second, third +2 more")
  })

  it("gives no flow when nothing was traced", () => {
    expect(generateJourneyFlowDiagram([])).toBeNull()
  })
})
