import { layoutBlast, type PlacedBlastNode } from "@/blast/layout"
import type { Blast } from "@flightplan/configurations"

const LABEL_BY_PATH = new Map([
  ["src/pricing.ts", "pricing.ts"],
  ["src/cart.ts", "cart.ts"],
  ["src/checkout.ts", "checkout.ts"],
  ["src/ui.ts", "ui.ts"],
  ["src/logger.ts", "logger.ts"],
])

const blast: Blast = {
  nodes: [
    { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null },
    { path: "src/checkout.ts", diffType: null, impactType: null, impactReason: null },
    { path: "src/logger.ts", diffType: null, impactType: null, impactReason: null },
    { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null },
    { path: "src/ui.ts", diffType: null, impactType: null, impactReason: null },
  ],
  edges: [
    { importer: "src/cart.ts", imported: "src/pricing.ts" },
    { importer: "src/checkout.ts", imported: "src/pricing.ts" },
    { importer: "src/ui.ts", imported: "src/pricing.ts" },
  ],
}

const placedAt = (nodes: readonly PlacedBlastNode[], path: string): PlacedBlastNode => {
  const placed = nodes.find((candidate) => candidate.node.path === path)
  if (placed === undefined) throw new Error(`No node at ${path}`)
  return placed
}

const distanceBetween = (one: PlacedBlastNode, two: PlacedBlastNode): number => Math.hypot(one.x - two.x, one.y - two.y)

describe("layoutBlast", () => {
  it("places every file once, inside the board", () => {
    const layout = layoutBlast(blast, LABEL_BY_PATH)

    expect(layout.nodes.map((placed) => placed.node.path)).toStrictEqual(blast.nodes.map((node) => node.path))
    expect(layout.nodes.every((placed) => placed.x > 0 && placed.x < layout.width && placed.y > 0 && placed.y < layout.height)).toBe(true)
  })

  it("gives the same places every time", () => {
    expect(layoutBlast(blast, LABEL_BY_PATH)).toStrictEqual(layoutBlast(blast, LABEL_BY_PATH))
  })

  it("draws a file larger the more files it is connected to", () => {
    const { nodes } = layoutBlast(blast, LABEL_BY_PATH)

    expect(placedAt(nodes, "src/pricing.ts").radius).toBeGreaterThan(placedAt(nodes, "src/cart.ts").radius)
    expect(placedAt(nodes, "src/cart.ts").radius).toBeGreaterThan(placedAt(nodes, "src/logger.ts").radius)
  })

  it("keeps two files apart by at least their labels", () => {
    const { nodes } = layoutBlast(blast, LABEL_BY_PATH)
    const pairs = nodes.flatMap((one, position) => nodes.slice(position + 1).map((two) => [one, two] as const))

    expect(pairs.every(([one, two]) => Math.abs(one.x - two.x) >= 40 || Math.abs(one.y - two.y) >= 30)).toBe(true)
  })

  it("draws an import as a straight line from the rim of the importer to the rim of the imported file", () => {
    const layout = layoutBlast(blast, LABEL_BY_PATH)
    const cart = placedAt(layout.nodes, "src/cart.ts")
    const pricing = placedAt(layout.nodes, "src/pricing.ts")
    const [start, end] = layout.edges[0].points

    expect(layout.edges.map((placed) => placed.edge)).toStrictEqual(blast.edges)
    expect(Math.hypot(start.x - cart.x, start.y - cart.y)).toBeLessThan(cart.radius + 8)
    expect(Math.hypot(end.x - pricing.x, end.y - pricing.y)).toBeLessThan(pricing.radius + 8)
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeLessThan(distanceBetween(cart, pricing))
  })

  it("leaves out an import of a file that is not on the diagram", () => {
    const layout = layoutBlast({ nodes: blast.nodes, edges: [{ importer: "src/cart.ts", imported: "src/missing.ts" }] }, LABEL_BY_PATH)

    expect(layout.edges).toStrictEqual([])
  })

  it("puts the change at the centre of the board", () => {
    const layout = layoutBlast(blast, LABEL_BY_PATH)
    const pricing = placedAt(layout.nodes, "src/pricing.ts")

    expect(Math.abs(pricing.x - layout.width / 2)).toBeLessThan(24)
    expect(Math.abs(pricing.y - layout.height / 2)).toBeLessThan(24)
  })

  it("puts the deepest file of a changed chain innermost, and the files that import it further out", () => {
    const chain: Blast = {
      nodes: ["src/a.ts", "src/b.ts", "src/c.ts"].map((path) => ({ path, diffType: "modified" as const, impactType: null, impactReason: null })),
      edges: [
        { importer: "src/a.ts", imported: "src/b.ts" },
        { importer: "src/b.ts", imported: "src/c.ts" },
      ],
    }
    const layout = layoutBlast(chain, new Map())
    const fromCentre = (path: string): number => {
      const placed = placedAt(layout.nodes, path)
      return Math.hypot(placed.x - layout.width / 2, placed.y - layout.height / 2)
    }

    expect(fromCentre("src/c.ts")).toBeLessThan(fromCentre("src/b.ts"))
    expect(fromCentre("src/b.ts")).toBeLessThan(fromCentre("src/a.ts"))
  })

  it("puts a file further from the centre the more imports lie between it and the change", () => {
    const far: Blast = {
      nodes: [
        { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null },
        { path: "src/page.ts", diffType: null, impactType: null, impactReason: null },
        { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null },
      ],
      edges: [
        { importer: "src/cart.ts", imported: "src/pricing.ts" },
        { importer: "src/page.ts", imported: "src/cart.ts" },
      ],
    }
    const layout = layoutBlast(far, new Map())
    const fromCentre = (path: string): number => {
      const placed = placedAt(layout.nodes, path)
      return Math.hypot(placed.x - layout.width / 2, placed.y - layout.height / 2)
    }

    expect(fromCentre("src/cart.ts")).toBeLessThan(fromCentre("src/page.ts"))
  })

  it("gives an empty board for an empty diagram", () => {
    expect(layoutBlast({ nodes: [], edges: [] }, new Map())).toStrictEqual({ width: 64, height: 64, nodes: [], edges: [] })
  })
})
