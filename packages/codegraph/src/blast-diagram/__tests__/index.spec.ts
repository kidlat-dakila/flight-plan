import { generateBlastDiagram } from "@/blast-diagram"
import type { ImportGraphFile } from "@/import-graph"

const importGraphFile = (filePath: string, diffType: ImportGraphFile["diffType"], importsTo: readonly string[]): ImportGraphFile => ({
  filePath,
  gitSha: "head-commit",
  diffType,
  importedBy: [],
  importsTo,
  importedFilePaths: new Map(),
})

describe("generateBlastDiagram", () => {
  it("makes a node of every file of the import graph, with how the change touched it", () => {
    const blastDiagram = generateBlastDiagram([
      importGraphFile("src/cart.ts", null, ["src/pricing.ts"]),
      importGraphFile("src/legacy-pricing.ts", "deleted", []),
      importGraphFile("src/pricing.ts", "modified", ["src/types.ts"]),
      importGraphFile("src/types.ts", "added", []),
    ])

    expect(blastDiagram.nodes).toStrictEqual([
      { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null },
      { path: "src/legacy-pricing.ts", diffType: "deleted", impactType: null, impactReason: null },
      { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null },
      { path: "src/types.ts", diffType: "added", impactType: null, impactReason: null },
    ])
  })

  it("makes an edge of every import, from the file that imports to the file it imports", () => {
    const blastDiagram = generateBlastDiagram([
      importGraphFile("src/cart.ts", null, ["src/pricing.ts", "src/types.ts"]),
      importGraphFile("src/pricing.ts", "modified", ["src/types.ts"]),
      importGraphFile("src/types.ts", null, []),
    ])

    expect(blastDiagram.edges).toStrictEqual([
      { importer: "src/cart.ts", imported: "src/pricing.ts" },
      { importer: "src/cart.ts", imported: "src/types.ts" },
      { importer: "src/pricing.ts", imported: "src/types.ts" },
    ])
  })

  it("leaves out a file's import of itself", () => {
    expect(generateBlastDiagram([importGraphFile("src/cart.ts", "modified", ["src/cart.ts"])]).edges).toStrictEqual([])
  })

  it("gives an empty diagram for an empty import graph", () => {
    expect(generateBlastDiagram([])).toStrictEqual({ nodes: [], edges: [] })
  })
})
