import { describe, expect, it } from "vitest"
import { traceImporters, type ImporterNode } from "../../importTree"
import { pythonImportGraph, type PyRepo } from ".."

function trace(files: Record<string, string>, target: string, roots: string[] = [""]): Promise<ImporterNode> {
  const repo: PyRepo = {
    files: new Set(Object.keys(files)),
    read: async (p) => files[p] ?? null,
    rootsFor: async () => roots,
  }
  // dumb candidate filter: any file whose text mentions the queried file's stem.
  // Per-call, not fixed to the original target — `importersOf` (importTree.ts)
  // calls `candidates(file)` with whichever file is currently being climbed.
  const stemOf = (file: string) => (file.split("/").pop() ?? file).replace(/\.py$/, "")
  const candidates = async (file: string) =>
    Object.entries(files)
      .filter(([, text]) => /import|from/.test(text) && text.includes(stemOf(file)))
      .map(([path]) => path)
  return traceImporters(pythonImportGraph(repo, candidates), target)
}

describe("python import climb", () => {
  it("finds a direct importer", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": "def price_of():\n    return 1\n",
        "pkg/checkout.py": "from pkg.pricing import price_of\ndef checkout():\n    return price_of()\n",
      },
      "pkg/pricing.py",
    )
    expect(node.importedBy).toHaveLength(1)
    expect(node.importedBy[0].file).toBe("pkg/checkout.py")
    expect(node.importedBy[0].edges[0].kind).toBe("static")
  })

  it("climbs a chain and a relative import", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/pricing.py": "def price_of():\n    return 1\n",
        "pkg/checkout.py": "from . import pricing\ndef checkout():\n    return pricing.price_of()\n",
        "pkg/order.py": "from pkg import checkout\n",
      },
      "pkg/pricing.py",
    )
    const importer = node.importedBy.find((n) => n.file === "pkg/checkout.py")
    expect(importer).toBeDefined()
    expect(importer?.importedBy.some((n) => n.file === "pkg/order.py")).toBe(true)
  })

  it("marks a TYPE_CHECKING import as a type edge", async () => {
    const node = await trace(
      {
        "pkg/__init__.py": "",
        "pkg/models.py": "class Thing:\n    pass\n",
        "pkg/use.py": ["from typing import TYPE_CHECKING", "if TYPE_CHECKING:", "    from pkg.models import Thing"].join("\n"),
      },
      "pkg/models.py",
    )
    expect(node.importedBy[0]?.edges[0].kind).toBe("type")
  })
})
