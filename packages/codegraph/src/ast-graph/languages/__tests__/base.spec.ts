import {
  BaseASTGraphFile,
  NAMESPACE_IMPORT,
  type Encapsulation,
  type FileVariable,
  type ImportVariable,
  type SourceRange,
  type SymbolReference,
} from "@/ast-graph"
import { parseWithGrammar } from "@/ast-graph/parser"

interface Listing {
  readonly encapsulations?: readonly Encapsulation[]
  readonly variables?: readonly FileVariable[]
  readonly imports?: readonly ImportVariable[]
  readonly references?: readonly SymbolReference[]
}

const range = (startLine: number, startColumn: number, endLine: number, endColumn: number): SourceRange => ({
  start: { line: startLine, column: startColumn },
  end: { line: endLine, column: endColumn },
})

const FILE_SCOPE = range(1, 0, 40, 0)
const NAME_LENGTH = 5

const at = (line: number, column: number): SourceRange => range(line, column, line, column + NAME_LENGTH)

const variable = (name: string, declaredAt: SourceRange, scope: SourceRange = FILE_SCOPE): FileVariable => ({
  name,
  range: declaredAt,
  scope,
  declarationType: "inline-declaration",
  type: "primitive",
})

const imported = (name: string, importedName: string, importedFilePath: string | null, declaredAt: SourceRange): ImportVariable => ({
  name,
  importedName,
  specifier: "./pricing",
  importedFilePath,
  range: declaredAt,
  scope: FILE_SCOPE,
})

const fileOf = (listing: Listing): BaseASTGraphFile => {
  class ListedASTGraphFile extends BaseASTGraphFile {
    protected extractRootEncapsulations(): readonly Encapsulation[] {
      return listing.encapsulations ?? []
    }

    protected extractFileVariables(): readonly FileVariable[] {
      return listing.variables ?? []
    }

    protected extractImportVariables(): readonly ImportVariable[] {
      return listing.imports ?? []
    }

    protected extractReferences(): readonly SymbolReference[] {
      return listing.references ?? []
    }
  }
  return new ListedASTGraphFile({
    filePath: "src/checkout.ts",
    gitSha: "head-commit",
    tree: parseWithGrammar("typescript", ""),
    importedBy: ["src/page.ts"],
    importsTo: ["src/pricing.ts"],
    importedFilePaths: new Map([["./pricing", "src/pricing.ts"]]),
  })
}

const INNER: Encapsulation = { name: "applyDiscount", kind: "function", range: range(12, 2, 16, 3), encapsulations: [] }
const INNERMOST: Encapsulation = { name: "roundCents", kind: "function", range: range(22, 4, 24, 5), encapsulations: [] }
const METHOD: Encapsulation = { name: "total", kind: "method", range: range(21, 2, 26, 3), encapsulations: [INNERMOST] }
const LIMIT: Encapsulation = { name: "LIMIT", kind: "variable", range: range(3, 0, 3, 16), encapsulations: [] }
const CHECKOUT: Encapsulation = { name: "checkout", kind: "function", range: range(10, 0, 18, 1), encapsulations: [INNER] }
const CART: Encapsulation = { name: "Cart", kind: "class", range: range(20, 0, 27, 1), encapsulations: [METHOD] }
const ENCAPSULATIONS = [LIMIT, CHECKOUT, CART]

describe("BaseASTGraphFile", () => {
  it("keeps what it is told about the file and what its language extracts from the tree", () => {
    const limit = variable("LIMIT", at(3, 6))
    const priceOf = imported("priceOf", "priceOf", "src/pricing.ts", at(1, 9))
    const file = fileOf({ encapsulations: ENCAPSULATIONS, variables: [limit], imports: [priceOf] })

    expect(file.filePath).toBe("src/checkout.ts")
    expect(file.gitSha).toBe("head-commit")
    expect(file.importedBy).toStrictEqual(["src/page.ts"])
    expect(file.importsTo).toStrictEqual(["src/pricing.ts"])
    expect(file.listRootEncapsulations()).toStrictEqual(ENCAPSULATIONS)
    expect(file.listFileVariables()).toStrictEqual([limit])
    expect(file.listImportVariables()).toStrictEqual([priceOf])
  })

  describe("findRootEncapsulation", () => {
    it.each([
      ["a line of a root function", [11, 11], CHECKOUT],
      ["lines inside a nested function", [13, 14], CHECKOUT],
      ["lines deep inside a class", [23, 23], CART],
      ["the line of a root variable", [3, 3], LIMIT],
      ["every line of a root encapsulation", [10, 18], CHECKOUT],
    ] as const)("finds the root encapsulation of %s", (_lines, lines, found) => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS })

      expect(file.findRootEncapsulation(lines)).toBe(found)
    })

    it.each([
      ["a line outside every encapsulation", [5, 5]],
      ["lines that span two root encapsulations", [17, 21]],
      ["lines that start before an encapsulation", [9, 11]],
    ] as const)("finds none for %s", (_lines, lines) => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS })

      expect(file.findRootEncapsulation(lines)).toBeNull()
    })
  })

  describe("findEncapsulation", () => {
    it.each([
      ["lines of a nested function", [13, 14], INNER],
      ["a line of a root function outside its nested function", [11, 11], CHECKOUT],
      ["lines that reach past a nested function", [15, 17], CHECKOUT],
      ["a line of a function nested in a method", [23, 23], INNERMOST],
      ["a line of a method outside its nested function", [25, 25], METHOD],
      ["a line of a class outside its method", [20, 20], CART],
    ] as const)("finds the nearest encapsulation of %s", (_lines, lines, found) => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS })

      expect(file.findEncapsulation(lines)).toBe(found)
    })

    it("finds none for a line outside every encapsulation", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS })

      expect(file.findEncapsulation([5, 5])).toBeNull()
    })
  })

  describe("traceUsage", () => {
    it("finds every use of a declaration, with the encapsulations each use sits in", () => {
      const limit = variable("LIMIT", at(3, 6))
      const file = fileOf({
        encapsulations: ENCAPSULATIONS,
        variables: [limit],
        references: [{ name: "LIMIT", range: at(11, 9) }, { name: "LIMIT", range: at(23, 13) }, { name: "LIMIT", range: at(29, 0) }],
      })

      expect(file.traceUsage(limit)).toStrictEqual([
        { range: at(11, 9), encapsulation: CHECKOUT, rootEncapsulation: CHECKOUT },
        { range: at(23, 13), encapsulation: INNERMOST, rootEncapsulation: CART },
        { range: at(29, 0), encapsulation: null, rootEncapsulation: null },
      ])
    })

    it("leaves out the uses of another declaration with the same name in a nearer scope", () => {
      const outer = variable("total", at(2, 6))
      const shadow = variable("total", at(12, 10), INNER.range)
      const file = fileOf({
        encapsulations: ENCAPSULATIONS,
        variables: [outer, shadow],
        references: [{ name: "total", range: at(11, 9) }, { name: "total", range: at(14, 11) }],
      })

      expect(file.traceUsage(outer).map((usage) => usage.range)).toStrictEqual([at(11, 9)])
      expect(file.traceUsage(shadow).map((usage) => usage.range)).toStrictEqual([at(14, 11)])
    })

    it("resolves a use through three nested scopes to the nearest declaration", () => {
      const outer = variable("rate", at(2, 6))
      const middle = variable("rate", at(21, 8), METHOD.range)
      const inner = variable("rate", at(22, 12), INNERMOST.range)
      const file = fileOf({
        encapsulations: ENCAPSULATIONS,
        variables: [inner, outer, middle],
        references: [{ name: "rate", range: at(23, 6) }, { name: "rate", range: at(25, 6) }, { name: "rate", range: at(30, 0) }],
      })

      expect(file.traceUsage(inner).map((usage) => usage.range)).toStrictEqual([at(23, 6)])
      expect(file.traceUsage(middle).map((usage) => usage.range)).toStrictEqual([at(25, 6)])
      expect(file.traceUsage(outer).map((usage) => usage.range)).toStrictEqual([at(30, 0)])
    })

    it("leaves out the uses of other names", () => {
      const limit = variable("LIMIT", at(3, 6))
      const file = fileOf({ variables: [limit, variable("OTHER", at(4, 6))], references: [{ name: "OTHER", range: at(11, 9) }] })

      expect(file.traceUsage(limit)).toStrictEqual([])
    })

    it("traces from a use of a name to the other uses of its declaration", () => {
      const limit = variable("LIMIT", at(3, 6))
      const file = fileOf({
        variables: [limit],
        references: [{ name: "LIMIT", range: at(11, 9) }, { name: "LIMIT", range: at(23, 13) }],
      })

      expect(file.traceUsage({ name: "LIMIT", range: at(11, 9) }).map((usage) => usage.range)).toStrictEqual([at(11, 9), at(23, 13)])
    })

    it("traces the uses of an import variable", () => {
      const priceOf = imported("priceOf", "priceOf", "src/pricing.ts", at(1, 9))
      const file = fileOf({ encapsulations: ENCAPSULATIONS, imports: [priceOf], references: [{ name: "priceOf", range: at(13, 11) }] })

      expect(file.traceUsage(priceOf)).toStrictEqual([{ range: at(13, 11), encapsulation: INNER, rootEncapsulation: CHECKOUT }])
    })

    it("finds no uses of a name the file does not declare", () => {
      const file = fileOf({ references: [{ name: "window", range: at(11, 9) }] })

      expect(file.traceUsage({ name: "window", range: at(11, 9) })).toStrictEqual([])
    })

    it("finds no uses of a name outside the scope it is declared in", () => {
      const local = variable("local", at(12, 10), INNER.range)
      const file = fileOf({ variables: [local], references: [{ name: "local", range: at(30, 0) }] })

      expect(file.traceUsage(local)).toStrictEqual([])
    })
  })

  describe("isFileUsingSymbol", () => {
    const priceOf = imported("priceOf", "priceOf", "src/pricing.ts", at(1, 9))
    const use = (name: string): SymbolReference => ({ name, range: at(13, 11) })

    it("says a file uses a symbol it imports from the file and refers to", () => {
      const file = fileOf({ imports: [priceOf], references: [use("priceOf")] })

      expect(file.isFileUsingSymbol({ filePath: "src/pricing.ts", name: "priceOf" })).toBe(true)
    })

    it("follows the symbol under the name the import gives it", () => {
      const file = fileOf({ imports: [imported("price", "priceOf", "src/pricing.ts", at(1, 9))], references: [use("price")] })

      expect(file.isFileUsingSymbol({ filePath: "src/pricing.ts", name: "priceOf" })).toBe(true)
      expect(file.isFileUsingSymbol({ filePath: "src/pricing.ts", name: "price" })).toBe(false)
    })

    it("counts a use of a namespace import of the file", () => {
      const file = fileOf({ imports: [imported("pricing", NAMESPACE_IMPORT, "src/pricing.ts", at(1, 12))], references: [use("pricing")] })

      expect(file.isFileUsingSymbol({ filePath: "src/pricing.ts", name: "priceOf" })).toBe(true)
    })

    it.each([
      ["imports the symbol and never refers to it", { imports: [priceOf] }],
      ["imports another symbol of the file", { imports: [imported("taxOf", "taxOf", "src/pricing.ts", at(1, 9))], references: [use("taxOf")] }],
      ["imports a symbol of that name from another file", { imports: [imported("priceOf", "priceOf", "src/legacy.ts", at(1, 9))], references: [use("priceOf")] }],
      ["imports the symbol from a package outside the repository", { imports: [imported("priceOf", "priceOf", null, at(1, 9))], references: [use("priceOf")] }],
      ["refers to a local declaration that hides the import", { imports: [priceOf], variables: [variable("priceOf", at(12, 10), INNER.range)], references: [use("priceOf")] }],
      ["imports nothing", {}],
    ])("says a file does not use a symbol when it %s", (_reason, listing) => {
      const file = fileOf(listing)

      expect(file.isFileUsingSymbol({ filePath: "src/pricing.ts", name: "priceOf" })).toBe(false)
    })
  })

  it("hands the tree it is built with to each extraction", () => {
    const tree = parseWithGrammar("typescript", "const total = 1")
    const seen = vi.fn()
    class RecordingASTGraphFile extends BaseASTGraphFile {
      protected extractRootEncapsulations(given: unknown): readonly Encapsulation[] {
        seen("encapsulations", given)
        return []
      }

      protected extractFileVariables(given: unknown): readonly FileVariable[] {
        seen("variables", given)
        return []
      }

      protected extractImportVariables(given: unknown, importedFilePaths: ReadonlyMap<string, string>): readonly ImportVariable[] {
        seen("imports", given, [...importedFilePaths])
        return []
      }

      protected extractReferences(given: unknown): readonly SymbolReference[] {
        seen("references", given)
        return []
      }
    }

    const file = new RecordingASTGraphFile({
      filePath: "src/total.ts",
      gitSha: "head-commit",
      tree,
      importedBy: [],
      importsTo: [],
      importedFilePaths: new Map([["./pricing", "src/pricing.ts"]]),
    })

    expect(file.listRootEncapsulations()).toStrictEqual([])
    expect(seen.mock.calls).toStrictEqual([
      ["encapsulations", tree],
      ["variables", tree],
      ["imports", tree, [["./pricing", "src/pricing.ts"]]],
      ["references", tree],
    ])
  })
})
