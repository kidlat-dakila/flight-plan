import { generateBlastRadiusDiagram } from "@/blast-radius-diagram"
import type { ImportGraphFile } from "@/import-graph"

const importGraphFile = (filePath: string, diffType: ImportGraphFile["diffType"], importsTo: readonly string[]): ImportGraphFile => ({
  filePath,
  gitSha: "head-commit",
  diffType,
  importedBy: [],
  importsTo,
  importedFilePaths: new Map(),
})

describe("generateBlastRadiusDiagram", () => {
  it("makes a node of every file of the import graph, with how the change touched it", () => {
    const blast = generateBlastRadiusDiagram([
      importGraphFile("src/cart.ts", null, ["src/pricing.ts"]),
      importGraphFile("src/legacy-pricing.ts", "deleted", []),
      importGraphFile("src/pricing.ts", "modified", ["src/types.ts"]),
      importGraphFile("src/types.ts", "added", []),
    ])

    expect(blast.nodes).toStrictEqual([
      { path: "src/cart.ts", diffType: null, impactType: null, impactReason: null },
      { path: "src/legacy-pricing.ts", diffType: "deleted", impactType: null, impactReason: null },
      { path: "src/pricing.ts", diffType: "modified", impactType: null, impactReason: null },
      { path: "src/types.ts", diffType: "added", impactType: null, impactReason: null },
    ])
  })

  it("makes an edge of every import, from the file that imports to the file it imports", () => {
    const blast = generateBlastRadiusDiagram([
      importGraphFile("src/cart.ts", null, ["src/pricing.ts", "src/types.ts"]),
      importGraphFile("src/pricing.ts", "modified", ["src/types.ts"]),
      importGraphFile("src/types.ts", null, []),
    ])

    expect(blast.edges).toStrictEqual([
      { importer: "src/cart.ts", imported: "src/pricing.ts" },
      { importer: "src/cart.ts", imported: "src/types.ts" },
      { importer: "src/pricing.ts", imported: "src/types.ts" },
    ])
  })

  it("leaves out a file's import of itself", () => {
    expect(generateBlastRadiusDiagram([importGraphFile("src/cart.ts", "modified", ["src/cart.ts"])]).edges).toStrictEqual([])
  })

  it("gives an empty diagram for an empty import graph", () => {
    expect(generateBlastRadiusDiagram([])).toStrictEqual({ nodes: [], edges: [] })
  })
})
