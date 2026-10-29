import { blastColumnsOf, layoutBlast, type PlacedBlastNode } from "@/blast/layout"
import type { Blast } from "@flightplan/configurations"

const LABEL_BY_PATH = new Map([
  ["src/pricing.ts", "pricing.ts"],
  ["src/cart.ts", "cart.ts"],
  ["src/checkout.ts", "checkout.ts"],
  ["src/ui.ts", "ui.ts"],
  ["src/logger.ts", "logger.ts"],
])

const blastDiagram: Blast = {
  nodes: [
    { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
    { path: "src/checkout.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
    { path: "src/logger.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
    { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null, isRequired: false },
    { path: "src/ui.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
  ],
  edges: [
    { importer: "src/cart.ts", imported: "src/pricing.ts" },
    { importer: "src/checkout.ts", imported: "src/pricing.ts" },
    { importer: "src/ui.ts", imported: "src/pricing.ts" },
  ],
}

const LONG_CHAIN_LENGTH = 5_000
const LOOP_START = 2_000
const LOOP_END = 3_000

const chainPathOf = (position: number): string => `src/chain-${String(position)}.ts`

const longChainOf = (extraEdges: Blast["edges"]): Blast => {
  const positions = Array.from({ length: LONG_CHAIN_LENGTH }, (_position, position) => position)
  return {
    nodes: positions.map((position) => ({ path: chainPathOf(position), diffType: null, impactType: null, impactReason: null, isRequired: false })),
    edges: [
      ...positions.slice(1).map((position) => ({ importer: chainPathOf(position - 1), imported: chainPathOf(position) })),
      ...extraEdges,
    ],
  }
}

const placedAt = (nodes: readonly PlacedBlastNode[], path: string): PlacedBlastNode => {
  const placed = nodes.find((candidate) => candidate.node.path === path)
  if (placed === undefined) throw new Error(`No node at ${path}`)
  return placed
}

const distanceBetween = (one: PlacedBlastNode, two: PlacedBlastNode): number => Math.hypot(one.x - two.x, one.y - two.y)

describe("layoutBlast", () => {
  it("places every file once, inside the board", () => {
    const layout = layoutBlast(blastDiagram, LABEL_BY_PATH)

    expect(layout.nodes.map((placed) => placed.node.path)).toStrictEqual(blastDiagram.nodes.map((node) => node.path))
    expect(layout.nodes.every((placed) => placed.x > 0 && placed.x < layout.width && placed.y > 0 && placed.y < layout.height)).toBe(true)
  })

  it("gives the same places every time", () => {
    expect(layoutBlast(blastDiagram, LABEL_BY_PATH)).toStrictEqual(layoutBlast(blastDiagram, LABEL_BY_PATH))
  })

  it("draws a file larger the more files it is connected to", () => {
    const { nodes } = layoutBlast(blastDiagram, LABEL_BY_PATH)

    expect(placedAt(nodes, "src/pricing.ts").radius).toBeGreaterThan(placedAt(nodes, "src/cart.ts").radius)
    expect(placedAt(nodes, "src/cart.ts").radius).toBeGreaterThan(placedAt(nodes, "src/logger.ts").radius)
  })

  it("keeps two files apart by at least their labels", () => {
    const { nodes } = layoutBlast(blastDiagram, LABEL_BY_PATH)
    const pairs = nodes.flatMap((one, position) => nodes.slice(position + 1).map((two) => [one, two] as const))

    expect(pairs.every(([one, two]) => Math.abs(one.x - two.x) >= 40 || Math.abs(one.y - two.y) >= 30)).toBe(true)
  })

  it("draws an import as a straight line from the rim of the importer to the rim of the imported file", () => {
    const layout = layoutBlast(blastDiagram, LABEL_BY_PATH)
    const cart = placedAt(layout.nodes, "src/cart.ts")
    const pricing = placedAt(layout.nodes, "src/pricing.ts")
    const [start, end] = layout.edges[0].points

    expect(layout.edges.map((placed) => placed.edge)).toStrictEqual(blastDiagram.edges)
    expect(Math.hypot(start.x - cart.x, start.y - cart.y)).toBeLessThan(cart.radius + 8)
    expect(Math.hypot(end.x - pricing.x, end.y - pricing.y)).toBeLessThan(pricing.radius + 8)
    expect(Math.hypot(end.x - start.x, end.y - start.y)).toBeLessThan(distanceBetween(cart, pricing))
  })

  it("leaves out an import of a file that is not on the diagram", () => {
    const layout = layoutBlast({ nodes: blastDiagram.nodes, edges: [{ importer: "src/cart.ts", imported: "src/missing.ts" }] }, LABEL_BY_PATH)

    expect(layout.edges).toStrictEqual([])
  })

  it("puts a file that imports at the left of the file it imports, one column for each import of the longest chain", () => {
    const chain: Blast = {
      nodes: [
        { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
        { path: "src/page.ts", diffType: null, impactType: null, impactReason: null, isRequired: false },
        { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null, isRequired: false },
      ],
      edges: [
        { importer: "src/cart.ts", imported: "src/pricing.ts" },
        { importer: "src/page.ts", imported: "src/cart.ts" },
        { importer: "src/page.ts", imported: "src/pricing.ts" },
      ],
    }
    const { nodes } = layoutBlast(chain, new Map())

    expect(placedAt(nodes, "src/page.ts").x).toBeLessThan(placedAt(nodes, "src/cart.ts").x)
    expect(placedAt(nodes, "src/cart.ts").x).toBeLessThan(placedAt(nodes, "src/pricing.ts").x)
  })

  it("stacks the files that import the same file in one column, at its left", () => {
    const { nodes } = layoutBlast(blastDiagram, LABEL_BY_PATH)
    const importerColumns = ["src/cart.ts", "src/checkout.ts", "src/ui.ts"].map((path) => placedAt(nodes, path).x)

    expect(new Set(importerColumns).size).toBe(1)
    expect(importerColumns[0]).toBeLessThan(placedAt(nodes, "src/pricing.ts").x)
  })

  it("puts a file beside the files it is joined to, so that imports cross as little as they can", () => {
    const fan: Blast = {
      nodes: ["src/a.ts", "src/b.ts", "src/c.ts", "src/d.ts"].map((path) => ({ path, diffType: null, impactType: null, impactReason: null, isRequired: false })),
      edges: [
        { importer: "src/a.ts", imported: "src/d.ts" },
        { importer: "src/b.ts", imported: "src/c.ts" },
      ],
    }
    const { nodes } = layoutBlast(fan, new Map())
    const isAbove = (one: string, two: string): boolean => placedAt(nodes, one).y < placedAt(nodes, two).y

    expect(isAbove("src/a.ts", "src/b.ts")).toBe(isAbove("src/d.ts", "src/c.ts"))
  })

  it("places every file of two files that import each other", () => {
    const loop: Blast = {
      nodes: ["src/a.ts", "src/b.ts"].map((path) => ({ path, diffType: null, impactType: null, impactReason: null, isRequired: false })),
      edges: [
        { importer: "src/a.ts", imported: "src/b.ts" },
        { importer: "src/b.ts", imported: "src/a.ts" },
      ],
    }
    const layout = layoutBlast(loop, new Map())

    expect(placedAt(layout.nodes, "src/a.ts").x).toBeLessThan(placedAt(layout.nodes, "src/b.ts").x)
    expect(layout.edges).toHaveLength(2)
  })

  it("gives each file of a long import chain the column after the file that imports it", () => {
    const chain = longChainOf([])

    expect(blastColumnsOf(chain)).toStrictEqual(chain.nodes.map((_node, position) => position))
  })

  it("leaves out of the columns the import that closes a loop in the middle of a long import chain", () => {
    const loopCloser = { importer: chainPathOf(LOOP_END), imported: chainPathOf(LOOP_START) }
    const chain = longChainOf([loopCloser])

    expect(blastColumnsOf(chain)).toStrictEqual(chain.nodes.map((_node, position) => position))
  })

  it("gives an empty board for an empty diagram", () => {
    expect(layoutBlast({ nodes: [], edges: [] }, new Map())).toStrictEqual({ width: 64, height: 64, nodes: [], edges: [] })
  })
})
