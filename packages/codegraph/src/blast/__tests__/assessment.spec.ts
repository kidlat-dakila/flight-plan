import { listCarriedImports, listReachedPaths, listUnassessedNodes } from "@/blast/assessment"
import type { Blast, BlastNode } from "@flightplan/configurations"

const file = (path: string, overrides: Partial<BlastNode> = {}): BlastNode => ({
  path,
  diffType: null,
  impactType: null,
  impactReason: null,
  isRequired: false,
  ...overrides,
})

const blastWith = (cart: Partial<BlastNode>): Blast => ({
  nodes: [
    file("src/cart.ts", cart),
    file("src/page.ts"),
    file("src/pricing.ts", { diffType: "modified" }),
    file("src/report.ts"),
    file("src/types.ts"),
  ],
  edges: [
    { importer: "src/cart.ts", imported: "src/pricing.ts" },
    { importer: "src/page.ts", imported: "src/cart.ts" },
    { importer: "src/report.ts", imported: "src/pricing.ts" },
    { importer: "src/pricing.ts", imported: "src/types.ts" },
  ],
})

describe("listReachedPaths", () => {
  it("reaches every file that imports a changed file, directly or through other files", () => {
    expect([...listReachedPaths(blastWith({}))].sort()).toStrictEqual(["src/cart.ts", "src/page.ts", "src/report.ts"])
  })

  it("never reaches a file the changed code only imports", () => {
    expect(listReachedPaths(blastWith({})).has("src/types.ts")).toBe(false)
  })

  it("stops at an unaffected file, which is reached itself", () => {
    const reached = listReachedPaths(blastWith({ impactType: "unaffected" }))

    expect([...reached].sort()).toStrictEqual(["src/cart.ts", "src/report.ts"])
  })

  it("goes on through a file the change breaks", () => {
    expect(listReachedPaths(blastWith({ impactType: "breaks", impactReason: "It divides by the price.", isRequired: false })).has("src/page.ts")).toBe(true)
  })

  it("follows two files that import each other once", () => {
    const blastDiagram: Blast = {
      nodes: [file("src/a.ts"), file("src/b.ts"), file("src/c.ts", { diffType: "added" })],
      edges: [
        { importer: "src/a.ts", imported: "src/b.ts" },
        { importer: "src/b.ts", imported: "src/a.ts" },
        { importer: "src/b.ts", imported: "src/c.ts" },
      ],
    }

    expect([...listReachedPaths(blastDiagram)].sort()).toStrictEqual(["src/a.ts", "src/b.ts"])
  })
})

describe("listUnassessedNodes", () => {
  it("lists the reached files with no impact type", () => {
    const blastDiagram = blastWith({ impactType: "behaviour-changes", impactReason: "It rounds later.", isRequired: false })

    expect(listUnassessedNodes(blastDiagram).map((node) => node.path)).toStrictEqual(["src/page.ts", "src/report.ts"])
  })
})

describe("listCarriedImports", () => {
  it("lists the imports of a file that carry the change to it", () => {
    expect(listCarriedImports(blastWith({}), "src/page.ts")).toStrictEqual(["src/cart.ts"])
    expect(listCarriedImports(blastWith({}), "src/cart.ts")).toStrictEqual(["src/pricing.ts"])
  })

  it("leaves out an import the change stops at", () => {
    expect(listCarriedImports(blastWith({ impactType: "unaffected" }), "src/page.ts")).toStrictEqual([])
  })
})
