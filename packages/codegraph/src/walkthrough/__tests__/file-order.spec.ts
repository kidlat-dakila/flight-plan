import { listUsedPaths, orderFiles, type OrderedFile } from "@/walkthrough/file-order"
import type { CodeReference, SourceFile } from "@flightplan/configurations"

const referenceTo = (path: string, isLibrary = false): CodeReference => ({ line: 1, startColumn: 1, endColumn: 2, path, lines: [1, 1], isLibrary })

const sourceOf = (path: string, usedPaths: readonly string[] = []): SourceFile => ({
  path,
  language: "typescript",
  lines: [],
  declarations: {},
  references: usedPaths.map((used) => referenceTo(used)),
  languageReferences: [],
  exports: [],
})

const fileOf = (path: string, marks: Partial<Omit<OrderedFile, "path">> = {}): OrderedFile => ({ path, isCoreChange: false, isInSpotlight: false, ...marks })

const pathsOf = (files: readonly OrderedFile[]): string[] => files.map((file) => file.path)

const CHAIN = [sourceOf("a.ts"), sourceOf("b.ts", ["a.ts"]), sourceOf("c.ts", ["b.ts"])]

describe("listUsedPaths", () => {
  it("follows the files a file uses through other files, and leaves out the file itself and libraries", () => {
    const sources = [
      { ...sourceOf("page.ts", ["page.ts", "hooks.ts"]), references: [referenceTo("page.ts"), referenceTo("hooks.ts"), referenceTo("react", true)] },
      sourceOf("hooks.ts", ["api.ts"]),
      sourceOf("api.ts"),
    ]

    expect(listUsedPaths(sources).get("page.ts")).toStrictEqual(new Set(["hooks.ts", "api.ts"]))
  })
})

describe("orderFiles", () => {
  const files = [fileOf("c.ts"), fileOf("a.ts"), fileOf("b.ts")]

  it("puts a file before the files that use it, from the bottom of the imports up", () => {
    expect(pathsOf(orderFiles(files, "imports-bottom-up", CHAIN))).toStrictEqual(["a.ts", "b.ts", "c.ts"])
  })

  it("puts a file before the files it uses, from the top of the imports down", () => {
    expect(pathsOf(orderFiles(files, "imports-top-down", CHAIN))).toStrictEqual(["c.ts", "b.ts", "a.ts"])
  })

  it("orders two files by a file between them that is not in the walkthrough", () => {
    expect(pathsOf(orderFiles([fileOf("c.ts"), fileOf("a.ts")], "imports-bottom-up", CHAIN))).toStrictEqual(["a.ts", "c.ts"])
  })

  it("keeps the stored order between files the imports do not order", () => {
    const sources = [sourceOf("x.ts"), sourceOf("y.ts"), sourceOf("z.ts")]
    const unrelated = [fileOf("z.ts"), fileOf("x.ts"), fileOf("y.ts")]

    expect(pathsOf(orderFiles(unrelated, "imports-bottom-up", sources))).toStrictEqual(["z.ts", "x.ts", "y.ts"])
    expect(pathsOf(orderFiles(unrelated, "imports-top-down", sources))).toStrictEqual(["z.ts", "x.ts", "y.ts"])
  })

  it("keeps the files of a cycle in their stored order, below the files that use them", () => {
    const sources = [sourceOf("a.ts", ["b.ts"]), sourceOf("b.ts", ["a.ts"]), sourceOf("c.ts", ["a.ts"])]
    const cycle = [fileOf("c.ts"), fileOf("b.ts"), fileOf("a.ts")]

    expect(pathsOf(orderFiles(cycle, "imports-bottom-up", sources))).toStrictEqual(["b.ts", "a.ts", "c.ts"])
    expect(pathsOf(orderFiles(cycle, "imports-top-down", sources))).toStrictEqual(["c.ts", "b.ts", "a.ts"])
  })

  it("puts core changes in the spotlight first, then core changes, then the spotlight, each in the bottom-up order", () => {
    const sources = [sourceOf("a.ts"), sourceOf("b.ts", ["a.ts"]), sourceOf("c.ts", ["b.ts"]), sourceOf("d.ts", ["c.ts"]), sourceOf("e.ts", ["d.ts"])]
    const marked = [
      fileOf("e.ts", { isCoreChange: true, isInSpotlight: true }),
      fileOf("d.ts", { isInSpotlight: true }),
      fileOf("c.ts", { isCoreChange: true }),
      fileOf("b.ts", { isInSpotlight: true }),
      fileOf("a.ts"),
    ]

    expect(pathsOf(orderFiles(marked, "important-first", sources))).toStrictEqual(["e.ts", "c.ts", "b.ts", "d.ts", "a.ts"])
  })
})
