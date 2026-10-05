import { clusterImportGraphs, createImportGraphContext, traceImportGraph, type ImportGraphFile } from "@/import-graph"
import { BASE_COMMIT, createFakeGitAdapter, HEAD_COMMIT, type FakeFiles } from "./fake-git-adapter"

const file = (filePath: string, importedBy: string[] = [], importsTo: string[] = [], diffType: ImportGraphFile["diffType"] = null): ImportGraphFile => ({
  filePath,
  gitSha: HEAD_COMMIT,
  diffType,
  importedBy,
  importsTo,
})

const chain = (...filePaths: string[]): ImportGraphFile[] =>
  filePaths.map((filePath, index) =>
    file(filePath, filePaths.slice(Math.max(0, index - 1), index), filePaths.slice(index + 1, index + 2)),
  )

const pathsOf = (clusters: readonly (readonly ImportGraphFile[])[]): string[][] =>
  clusters.map((cluster) => cluster.map((one) => one.filePath))

const clusterChange = async (head: FakeFiles, base: FakeFiles, changedPaths: readonly string[]): Promise<ImportGraphFile[][]> => {
  const gitAdapter = createFakeGitAdapter({ base, head })
  const context = await createImportGraphContext({ gitAdapter, baseCommit: BASE_COMMIT, headCommit: HEAD_COMMIT })
  return clusterImportGraphs(await Promise.all(changedPaths.map(async (filePath) => await traceImportGraph(context, filePath))))
}

describe("clusterImportGraphs", () => {
  it("joins two import graphs that share a file into one cluster", () => {
    const clusters = clusterImportGraphs([chain("diffA.ts", "a.ts", "b.ts"), chain("diffB.ts", "diffC.ts", "b.ts")])

    expect(pathsOf(clusters)).toStrictEqual([["a.ts", "b.ts", "diffA.ts", "diffB.ts", "diffC.ts"]])
  })

  it("keeps import graphs that share no file in separate clusters", () => {
    const clusters = clusterImportGraphs([
      chain("diffA.ts", "a.ts", "b.ts"),
      chain("diffX.ts", "y.ts", "z.ts"),
      chain("diffB.ts", "c.ts", "d.ts", "b.ts"),
      chain("diffE.ts", "f.ts", "g.ts", "z.ts"),
    ])

    expect(pathsOf(clusters)).toStrictEqual([
      ["a.ts", "b.ts", "c.ts", "d.ts", "diffA.ts", "diffB.ts"],
      ["diffE.ts", "diffX.ts", "f.ts", "g.ts", "y.ts", "z.ts"],
    ])
  })

  it("joins two clusters when a later import graph connects them", () => {
    const clusters = clusterImportGraphs([
      chain("diffA.ts", "a.ts"),
      chain("diffX.ts", "x.ts"),
      chain("diffM.ts", "a.ts"),
      chain("x.ts", "bridge.ts", "a.ts"),
    ])

    expect(pathsOf(clusters)).toStrictEqual([["a.ts", "bridge.ts", "diffA.ts", "diffM.ts", "diffX.ts", "x.ts"]])
  })

  it("gives the same clusters whatever order the import graphs come in", () => {
    const importGraphs = [
      chain("diffA.ts", "a.ts", "b.ts"),
      chain("diffX.ts", "y.ts", "z.ts"),
      chain("diffB.ts", "c.ts", "b.ts"),
      chain("z.ts", "tail.ts"),
    ]

    expect(clusterImportGraphs([...importGraphs].reverse())).toStrictEqual(clusterImportGraphs(importGraphs))
  })

  it("keeps a file once and gathers everything the import graphs know about its imports", () => {
    const clusters = clusterImportGraphs([
      [file("diffA.ts", [], ["b.ts"], "modified"), file("b.ts", ["diffA.ts"], ["c.ts"]), file("c.ts", ["b.ts"])],
      [file("diffB.ts", [], ["b.ts"], "added"), file("b.ts", ["diffB.ts"], ["c.ts"]), file("c.ts", ["b.ts"])],
    ])

    expect(clusters).toStrictEqual([
      [
        file("b.ts", ["diffA.ts", "diffB.ts"], ["c.ts"]),
        file("c.ts", ["b.ts"]),
        file("diffA.ts", [], ["b.ts"], "modified"),
        file("diffB.ts", [], ["b.ts"], "added"),
      ],
    ])
  })

  it("makes one cluster of the same import graph given twice", () => {
    const importGraph = chain("diffA.ts", "a.ts")

    expect(clusterImportGraphs([importGraph, importGraph])).toStrictEqual([[...importGraph].reverse()])
  })

  it("keeps a file that connects to nothing as a cluster of its own", () => {
    expect(pathsOf(clusterImportGraphs([[file("alone.ts")], chain("diffA.ts", "a.ts")]))).toStrictEqual([
      ["a.ts", "diffA.ts"],
      ["alone.ts"],
    ])
  })

  it("has no clusters without import graphs, and skips an empty one", () => {
    expect(clusterImportGraphs([])).toStrictEqual([])
    expect(clusterImportGraphs([[], chain("diffA.ts", "a.ts"), []])).toHaveLength(1)
  })

  it("leaves the import graphs it was given untouched", () => {
    const first = chain("diffA.ts", "b.ts")
    const second = chain("diffB.ts", "b.ts")

    clusterImportGraphs([first, second])

    expect([first, second]).toStrictEqual([chain("diffA.ts", "b.ts"), chain("diffB.ts", "b.ts")])
  })

  it("clusters the traces of a change, one cluster per connected part of each language", async () => {
    const base: FakeFiles = {
      "src/page.ts": "import \"./checkout\"\nimport \"./refund\"",
      "src/checkout.ts": "import \"./money\"",
      "src/refund.ts": "import \"./money\"",
      "src/money.ts": "",
      "src/admin/report.tsx": "import \"./table\"",
      "src/admin/table.tsx": "",
      "src/Banner.vue": "<script setup lang=\"ts\">\nimport \"./banner-text\"\n</script>",
      "src/banner-text.ts": "",
      "tools/report.py": "from . import money",
      "tools/money.py": "",
    }
    const head: FakeFiles = {
      ...base,
      "src/checkout.ts": "import \"./money\"\nexport const checkout = 1",
      "src/refund.ts": "import \"./money\"\nexport const refund = 1",
      "src/admin/table.tsx": "export const Table = () => null",
      "src/banner-text.ts": "export const text = \"Sale\"",
      "tools/money.py": "RATE = 2",
    }

    const clusters = await clusterChange(head, base, [
      "src/checkout.ts",
      "src/refund.ts",
      "src/admin/table.tsx",
      "src/banner-text.ts",
      "tools/money.py",
    ])

    expect(pathsOf(clusters)).toStrictEqual([
      ["src/Banner.vue", "src/banner-text.ts"],
      ["src/admin/report.tsx", "src/admin/table.tsx"],
      ["src/checkout.ts", "src/money.ts", "src/page.ts", "src/refund.ts"],
      ["tools/money.py", "tools/report.py"],
    ])
  })

  it("joins a deleted file with the changed files that imported it", async () => {
    const base: FakeFiles = { "src/checkout.ts": "import \"./legacy\"", "src/legacy.ts": "" }
    const head: FakeFiles = { "src/checkout.ts": "export const checkout = 1" }

    const clusters = await clusterChange(head, base, ["src/checkout.ts", "src/legacy.ts"])

    expect(clusters).toStrictEqual([
      [
        { filePath: "src/checkout.ts", gitSha: HEAD_COMMIT, diffType: "modified", importedBy: [], importsTo: ["src/legacy.ts"] },
        { filePath: "src/legacy.ts", gitSha: BASE_COMMIT, diffType: "deleted", importedBy: ["src/checkout.ts"], importsTo: [] },
      ],
    ])
  })
})
