import { layoutBlast } from "@/procedures/get-review/utils/blast/layout"
import type { Blast, BlastNode } from "@/procedures/get-review/utils/review-artifact"

const blastNode = (id: string, ring: number, path: string): BlastNode => ({
  id,
  ring,
  path,
  declaration: id,
  label: id,
  contract: null,
  verdict: null,
  effect: null,
})

const blast: Blast = {
  nodes: [blastNode("price", 0, "src/price.ts"), blastNode("format", 0, "src/price.ts"), blastNode("cart", 1, "src/cart.ts")],
  edges: [
    { from: "format", to: "price", kind: "call", certainty: "proven" },
    { from: "cart", to: "price", kind: "call", certainty: "proven" },
  ],
}

describe("layoutBlast", () => {
  it("gives each ring a column and groups a column's nodes by file", () => {
    const layout = layoutBlast(blast)

    expect(layout.zones.map((zone) => zone.ring)).toStrictEqual([0, 1])
    expect(layout.zones[0].x).toBeLessThan(layout.zones[1].x)
    expect(layout.files.map((file) => file.path)).toStrictEqual(["src/price.ts", "src/cart.ts"])
    expect(layout.nodes[0].y + layout.nodes[0].height).toBeLessThan(layout.nodes[1].y)
  })

  it("routes an edge across rings outward from the change, and an edge inside a ring along its side", () => {
    const layout = layoutBlast(blast)
    const within = layout.edges.find((placed) => placed.edge.from === "format")
    const across = layout.edges.find((placed) => placed.edge.from === "cart")

    expect(within?.route).toBe("within")
    expect(across?.route).toBe("across")
    expect(across?.points[0].x).toBeLessThan(across?.points[1].x ?? 0)
  })

  it("gives each edge its own place along the side of a node that several edges share", () => {
    const shared: Blast = {
      nodes: [blastNode("price", 0, "src/price.ts"), blastNode("cart", 1, "src/cart.ts"), blastNode("report", 1, "src/report.ts")],
      edges: [
        { from: "report", to: "price", kind: "call", certainty: "proven" },
        { from: "cart", to: "price", kind: "call", certainty: "proven" },
      ],
    }
    const layout = layoutBlast(shared)
    const [toReport, toCart] = layout.edges
    const price = layout.nodes.find((placed) => placed.node.id === "price")

    expect(toCart.points[0].y).toBeLessThan(toReport.points[0].y)
    expect(toCart.points[0].y).toBeGreaterThan(price?.y ?? 0)
    expect(toReport.points[0].y).toBeLessThan((price?.y ?? 0) + (price?.height ?? 0))
  })
})
