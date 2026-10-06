import { CHECKOUT_TREE, diagramNode, LOGGER_TREE, PRICE_OF_TREE, usedBy } from "@/ast-graph/__tests__/diagram-nodes"
import { generateBlastRadiusDiagram } from "@/blast-radius-diagram"

const ringsIn = (blast: ReturnType<typeof generateBlastRadiusDiagram>): (readonly [string, number])[] =>
  blast.nodes.map((node) => [node.declaration, node.ring] as const)

describe("generateBlastRadiusDiagram", () => {
  it("puts the change at the centre and each declaration on the ring of its distance", () => {
    expect(generateBlastRadiusDiagram([PRICE_OF_TREE])).toStrictEqual({
      nodes: [
        { id: "src/pricing.ts#priceOf", ring: 0, path: "src/pricing.ts", declaration: "priceOf", label: null, contract: null, verdict: null, effect: null },
        { id: "src/cart.ts#subtotal", ring: 1, path: "src/cart.ts", declaration: "subtotal", label: null, contract: null, verdict: null, effect: null },
        { id: "src/checkout.ts#checkout", ring: 2, path: "src/checkout.ts", declaration: "checkout", label: null, contract: null, verdict: null, effect: null },
        { id: "src/ui.ts#CheckoutButton", ring: 3, path: "src/ui.ts", declaration: "CheckoutButton", label: null, contract: null, verdict: null, effect: null },
      ],
      edges: [
        { from: "src/cart.ts#subtotal", to: "src/pricing.ts#priceOf", kind: "call", certainty: "proven" },
        { from: "src/checkout.ts#checkout", to: "src/cart.ts#subtotal", kind: "call", certainty: "proven" },
        { from: "src/ui.ts#CheckoutButton", to: "src/checkout.ts#checkout", kind: "call", certainty: "proven" },
      ],
    })
  })

  it("merges two changes on one chain and counts each ring from the nearest change", () => {
    expect(ringsIn(generateBlastRadiusDiagram([PRICE_OF_TREE, CHECKOUT_TREE]))).toStrictEqual([
      ["priceOf", 0],
      ["checkout", 0],
      ["subtotal", 1],
      ["CheckoutButton", 1],
    ])
  })

  it("takes the shortest of two paths to a declaration", () => {
    const page = diagramNode("src/page.ts", "Page")
    const tree = diagramNode("src/pricing.ts", "priceOf", [
      usedBy(diagramNode("src/cart.ts", "subtotal", [usedBy(page)])),
      usedBy(page),
    ])

    expect(ringsIn(generateBlastRadiusDiagram([tree]))).toStrictEqual([
      ["priceOf", 0],
      ["subtotal", 1],
      ["Page", 1],
    ])
  })

  it("shows a change nothing uses as a lone epicenter", () => {
    expect(ringsIn(generateBlastRadiusDiagram([LOGGER_TREE]))).toStrictEqual([["log", 0]])
  })

  it("always gives a diagram, also for no trees", () => {
    expect(generateBlastRadiusDiagram([])).toStrictEqual({ nodes: [], edges: [] })
  })
})
