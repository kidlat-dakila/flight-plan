import { describe, expect, it, vi } from "vitest"
import { languageOf, parseSource, readableExtensions, treeCache, withQueriedTree } from "@/core/tracer/parse"
import { walkCounts } from "@/core/walk-stats"

describe("which grammar reads which file", () => {
  it("routes by extension", () => {
    expect(languageOf("app/pricing.py")).toBe("python")
    expect(languageOf("app/stubs.pyi")).toBe("python")
  })

  it("says nothing rather than guessing for a file it has no grammar for", () => {
    expect(languageOf("config.json")).toBeNull()
    expect(languageOf("README.md")).toBeNull()
    expect(languageOf("Makefile")).toBeNull()
    expect(languageOf("src/pricing.ts")).toBeNull()
  })

  it("is case-insensitive about the extension", () => {
    expect(languageOf("app/Pricing.PY")).toBe("python")
  })

  it("lists its extensions, for narrowing a search", () => {
    expect(readableExtensions()).toStrictEqual([".py", ".pyi"])
  })
})

describe("parsing", () => {
  it("reads Python", async () => {
    const tree = await parseSource("app/pricing.py", "def price_of(ids: list[str]) -> int:\n    return len(ids)\n")
    expect(tree).not.toBeNull()
    expect(tree?.rootNode.hasError).toBe(false)
  })

  it("says nothing for a file no grammar covers", async () => {
    expect(await parseSource("config.json", "{ \"a\": 1 }")).toBeNull()
  })

  it("parses a file that does not compile, because syntax is not semantics", async () => {
    const tree = await parseSource("app/broken.py", "def price_of(:\n")
    expect(tree).not.toBeNull()
  })

  it("answers the same way twice, because the grammar is cached", async () => {
    const one = await parseSource("a.py", "x = 1\n")
    const two = await parseSource("b.py", "y = 2\n")
    expect(one?.rootNode.type).toBe("module")
    expect(two?.rootNode.type).toBe("module")
  })
})

describe("one walk's trees", () => {
  it("reads and parses a file once, however many ask for it", async () => {
    const trees = treeCache()
    const read = vi.fn(async () => await Promise.resolve("def price_of(item):\n    return item.price\n"))
    const [one, two] = await Promise.all([trees.treeOf("app/pricing.py", read), trees.treeOf("app/pricing.py", read)])
    expect(read).toHaveBeenCalledTimes(1)
    expect(one).not.toBeNull()
    expect(one).toBe(two)
    await trees.free()
  })

  it("frees every tree it parsed, and parses afresh after", async () => {
    const trees = treeCache()
    const read = async (file: string) => await Promise.resolve((file.endsWith(".py") ? "a = 1\n" : null))
    await trees.treeOf("app/a.py", read)
    await trees.treeOf("app/b.py", read)
    await trees.treeOf("README.md", read)
    const before = walkCounts().treesFreed
    await trees.free()
    expect(walkCounts().treesFreed - before).toBe(2)
    expect(await trees.treeOf("app/a.py", read)).not.toBeNull()
    await trees.free()
  })
})

describe("querying a tree", () => {
  const importSources = "(import_statement source: (string) @source)"
  const sourcesIn = async (grammar: "typescript" | "tsx", text: string): Promise<string[] | null> =>
    withQueriedTree(grammar, text, importSources, (tree, query) => query.captures(tree.rootNode).map((capture) => capture.node.text), null)

  it("reads TypeScript with the grammar asked for and hands the matches of the query to the reader", async () => {
    expect(await sourcesIn("typescript", "import a from \"./a\"\nimport b from './b'")).toStrictEqual(["\"./a\"", "'./b'"])
  })

  it("reads TSX", async () => {
    expect(await sourcesIn("tsx", "import a from \"./a\"\nexport const b = <a />")).toStrictEqual(["\"./a\""])
  })

  it("rejects a query the grammar cannot compile", async () => {
    await expect(
      withQueriedTree("typescript", "", "(no_such_node) @none", () => "read", "fallback"),
    ).rejects.toThrow("no_such_node")
  })
})
