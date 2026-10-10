import {
  ASTGraphFile,
  NAMESPACE_IMPORT,
  type Encapsulation,
  type ExportAlias,
  type FileVariable,
  type ImportVariable,
  type LineRange,
  type ReExport,
  type SourceRange,
  type Statement,
  type SymbolReference,
  type SymbolSpace,
  type SyntaxSite,
} from "@/ast-graph"
import { textOfTree } from "@/ast-graph/languages/file-syntax"
import { parseWithGrammar } from "@/ast-graph/parser"

interface Listing {
  readonly encapsulations?: readonly Encapsulation[]
  readonly variables?: readonly FileVariable[]
  readonly imports?: readonly ImportVariable[]
  readonly references?: readonly SymbolReference[]
  readonly exportAliases?: readonly ExportAlias[]
  readonly reExports?: readonly ReExport[]
  readonly syntaxSites?: readonly SyntaxSite[]
  readonly statements?: readonly Statement[]
}

const range = (startLine: number, startColumn: number, endLine: number, endColumn: number): SourceRange => ({
  start: { line: startLine, column: startColumn },
  end: { line: endLine, column: endColumn },
})

const FILE_SCOPE = range(1, 0, 40, 0)
const NAME_LENGTH = 5

const at = (line: number, column: number): SourceRange => range(line, column, line, column + NAME_LENGTH)

const VALUE: readonly SymbolSpace[] = ["value"]
const TYPE: readonly SymbolSpace[] = ["type"]
const VALUE_AND_TYPE: readonly SymbolSpace[] = ["value", "type"]

const reference = (name: string, usedAt: SourceRange, spaces: readonly SymbolSpace[] = VALUE): SymbolReference => ({
  name,
  range: usedAt,
  spaces,
})

const variable = (name: string, declaredAt: SourceRange, scope: SourceRange = FILE_SCOPE): FileVariable => ({
  name,
  range: declaredAt,
  scope,
  spaces: VALUE,
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
  spaces: VALUE_AND_TYPE,
})

const fileOf = (listing: Listing, diffLines: readonly LineRange[] = [], source = ""): ASTGraphFile =>
  new ASTGraphFile({
    filePath: "src/checkout.ts",
    diffLines,
    syntax: {
      ...textOfTree(parseWithGrammar("typescript", source)),
      rootEncapsulations: listing.encapsulations ?? [],
      fileVariables: listing.variables ?? [],
      importVariables: listing.imports ?? [],
      references: listing.references ?? [],
      exportAliases: listing.exportAliases ?? [],
      reExports: listing.reExports ?? [],
      syntaxSites: listing.syntaxSites ?? [],
      statements: listing.statements ?? [],
    },
  })

const INNER: Encapsulation = { name: "applyDiscount", kind: "function", range: range(12, 2, 16, 3), encapsulations: [] }
const INNERMOST: Encapsulation = { name: "roundCents", kind: "function", range: range(22, 4, 24, 5), encapsulations: [] }
const METHOD: Encapsulation = { name: "total", kind: "method", range: range(21, 2, 26, 3), encapsulations: [INNERMOST] }
const LIMIT: Encapsulation = { name: "LIMIT", kind: "variable", range: range(3, 0, 3, 16), encapsulations: [] }
const CHECKOUT: Encapsulation = { name: "checkout", kind: "function", range: range(10, 0, 18, 1), encapsulations: [INNER] }
const CART: Encapsulation = { name: "Cart", kind: "class", range: range(20, 0, 27, 1), encapsulations: [METHOD] }
const ENCAPSULATIONS = [LIMIT, CHECKOUT, CART]

describe("ASTGraphFile", () => {
  it("keeps the path of the file", () => {
    expect(fileOf({ encapsulations: ENCAPSULATIONS }).filePath).toBe("src/checkout.ts")
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

  describe("listDiffLocations", () => {
    it.each([
      ["a line of a root function", [11, 11], CHECKOUT, CHECKOUT],
      ["lines of a nested function", [13, 14], CHECKOUT, INNER],
      ["lines that reach past a nested function", [15, 17], CHECKOUT, CHECKOUT],
      ["a line of a function nested in a method", [23, 23], CART, INNERMOST],
      ["a line of a method outside its nested function", [25, 25], CART, METHOD],
      ["the line of a root variable", [3, 3], LIMIT, LIMIT],
    ] as const)("places %s in its root encapsulation and its nearest encapsulation", (_lines, lines, rootEncapsulation, parentEncapsulation) => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS }, [lines])

      expect(file.listDiffLocations()).toStrictEqual([{ diffLoC: lines, rootEncapsulation, parentEncapsulation }])
    })

    it("splits the diff of a whole file into one location per root encapsulation", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS }, [[1, 40]])

      expect(file.listDiffLocations()).toStrictEqual([
        { diffLoC: [3, 3], rootEncapsulation: LIMIT, parentEncapsulation: LIMIT },
        { diffLoC: [10, 18], rootEncapsulation: CHECKOUT, parentEncapsulation: CHECKOUT },
        { diffLoC: [20, 27], rootEncapsulation: CART, parentEncapsulation: CART },
      ])
    })

    it("splits lines that span two root encapsulations at the ends of each", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS }, [[13, 23]])

      expect(file.listDiffLocations()).toStrictEqual([
        { diffLoC: [13, 18], rootEncapsulation: CHECKOUT, parentEncapsulation: CHECKOUT },
        { diffLoC: [20, 23], rootEncapsulation: CART, parentEncapsulation: CART },
      ])
    })

    it("cuts lines that start before a root encapsulation down to the lines inside it", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS }, [[9, 11]])

      expect(file.listDiffLocations()).toStrictEqual([{ diffLoC: [10, 11], rootEncapsulation: CHECKOUT, parentEncapsulation: CHECKOUT }])
    })

    it("lists the locations of every changed range, in the order the ranges are given", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS }, [
        [23, 23],
        [3, 3],
      ])

      expect(file.listDiffLocations()).toStrictEqual([
        { diffLoC: [23, 23], rootEncapsulation: CART, parentEncapsulation: INNERMOST },
        { diffLoC: [3, 3], rootEncapsulation: LIMIT, parentEncapsulation: LIMIT },
      ])
    })

    it.each([
      ["lines outside every encapsulation", [[5, 5]]],
      ["no changed lines", []],
    ] as const)("lists no location for %s", (_lines, diffLines) => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS }, diffLines)

      expect(file.listDiffLocations()).toStrictEqual([])
    })
  })

  describe("traceUsage", () => {
    it("finds every use of a declaration, with the encapsulations each use sits in", () => {
      const limit = variable("LIMIT", at(3, 6))
      const file = fileOf({
        encapsulations: ENCAPSULATIONS,
        variables: [limit],
        references: [reference("LIMIT", at(11, 9)), reference("LIMIT", at(23, 13)), reference("LIMIT", at(29, 0))],
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
        references: [reference("total", at(11, 9)), reference("total", at(14, 11))],
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
        references: [reference("rate", at(23, 6)), reference("rate", at(25, 6)), reference("rate", at(30, 0))],
      })

      expect(file.traceUsage(inner).map((usage) => usage.range)).toStrictEqual([at(23, 6)])
      expect(file.traceUsage(middle).map((usage) => usage.range)).toStrictEqual([at(25, 6)])
      expect(file.traceUsage(outer).map((usage) => usage.range)).toStrictEqual([at(30, 0)])
    })

    it("leaves out the uses of other names", () => {
      const limit = variable("LIMIT", at(3, 6))
      const file = fileOf({ variables: [limit, variable("OTHER", at(4, 6))], references: [reference("OTHER", at(11, 9))] })

      expect(file.traceUsage(limit)).toStrictEqual([])
    })

    it("traces from a use of a name to the other uses of its declaration", () => {
      const limit = variable("LIMIT", at(3, 6))
      const file = fileOf({
        variables: [limit],
        references: [reference("LIMIT", at(11, 9)), reference("LIMIT", at(23, 13))],
      })

      expect(file.traceUsage({ name: "LIMIT", range: at(11, 9) }).map((usage) => usage.range)).toStrictEqual([at(11, 9), at(23, 13)])
    })

    it("traces the uses of an import variable", () => {
      const priceOf = imported("priceOf", "priceOf", "src/pricing.ts", at(1, 9))
      const file = fileOf({ encapsulations: ENCAPSULATIONS, imports: [priceOf], references: [reference("priceOf", at(13, 11))] })

      expect(file.traceUsage(priceOf)).toStrictEqual([{ range: at(13, 11), encapsulation: INNER, rootEncapsulation: CHECKOUT }])
    })

    it("keeps a value and a type of one name apart", () => {
      const schema = variable("Cart", at(2, 6))
      const shape: FileVariable = { ...variable("Cart", at(3, 5)), type: "type", spaces: TYPE }
      const file = fileOf({
        variables: [schema, shape],
        references: [reference("Cart", at(11, 9)), reference("Cart", at(12, 9), TYPE)],
      })

      expect(file.traceUsage(schema).map((usage) => usage.range)).toStrictEqual([at(11, 9)])
      expect(file.traceUsage(shape).map((usage) => usage.range)).toStrictEqual([at(12, 9)])
      expect(file.traceUsage({ name: "Cart", range: at(12, 9) }).map((usage) => usage.range)).toStrictEqual([at(12, 9)])
    })

    it("counts a use that means both the value and the type for each of them", () => {
      const schema = variable("Cart", at(2, 6))
      const shape: FileVariable = { ...variable("Cart", at(3, 5)), type: "type", spaces: TYPE }
      const file = fileOf({ variables: [schema, shape], references: [reference("Cart", at(30, 9), VALUE_AND_TYPE)] })

      expect(file.traceUsage(schema).map((usage) => usage.range)).toStrictEqual([at(30, 9)])
      expect(file.traceUsage(shape).map((usage) => usage.range)).toStrictEqual([at(30, 9)])
    })

    it("counts a use once for a declaration that is both a value and a type", () => {
      const cart: FileVariable = { ...variable("Cart", at(2, 6)), type: "class", spaces: VALUE_AND_TYPE }
      const file = fileOf({ variables: [cart], references: [reference("Cart", at(30, 9), VALUE_AND_TYPE)] })

      expect(file.traceUsage(cart).map((usage) => usage.range)).toStrictEqual([at(30, 9)])
    })

    it("finds no uses of a value where only a type is meant", () => {
      const schema = variable("Cart", at(2, 6))
      const file = fileOf({ variables: [schema], references: [reference("Cart", at(12, 9), TYPE)] })

      expect(file.traceUsage(schema)).toStrictEqual([])
    })

    it("counts a use for every declaration of its name that shares the nearest scope", () => {
      const first = variable("pricing", at(1, 7))
      const second = variable("pricing", at(2, 7))
      const hidden = variable("pricing", at(12, 10), INNER.range)
      const file = fileOf({ variables: [first, second, hidden], references: [reference("pricing", at(30, 0)), reference("pricing", at(14, 4))] })

      expect(file.traceUsage(first).map((usage) => usage.range)).toStrictEqual([at(30, 0)])
      expect(file.traceUsage(second).map((usage) => usage.range)).toStrictEqual([at(30, 0)])
      expect(file.traceUsage(hidden).map((usage) => usage.range)).toStrictEqual([at(14, 4)])
    })

    it("finds no uses of a name the file does not declare", () => {
      const file = fileOf({ references: [reference("window", at(11, 9))] })

      expect(file.traceUsage({ name: "window", range: at(11, 9) })).toStrictEqual([])
    })

    it("finds no uses of a name outside the scope it is declared in", () => {
      const local = variable("local", at(12, 10), INNER.range)
      const file = fileOf({ variables: [local], references: [reference("local", at(30, 0))] })

      expect(file.traceUsage(local)).toStrictEqual([])
    })
  })

  describe("the encapsulation a trace starts from", () => {
    const checkout = variable("checkout", at(10, 9))
    const applyDiscount = variable("applyDiscount", at(12, 8), CHECKOUT.range)
    const cart = variable("Cart", at(20, 6))
    const variables = [checkout, applyDiscount, cart]

    it("lists the encapsulations that hold an encapsulation, from the root down to it", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS })

      expect(file.listEncapsulationPath(INNERMOST)).toStrictEqual([CART, METHOD, INNERMOST])
      expect(file.listEncapsulationPath(LIMIT)).toStrictEqual([LIMIT])
      expect(file.listEncapsulationPath({ ...LIMIT })).toStrictEqual([])
    })

    it("finds the variable that names an encapsulation", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS, variables })

      expect(file.findEncapsulationDeclaration(CHECKOUT)).toBe(checkout)
      expect(file.findEncapsulationDeclaration(INNER)).toBe(applyDiscount)
    })

    it("finds no variable for a method, even when a parameter or a variable inside it has its name", () => {
      const parameter: FileVariable = { ...variable("total", at(21, 8), METHOD.range), declarationType: "argument" }
      const local = variable("total", at(22, 10), range(21, 16, 26, 3))
      const file = fileOf({ encapsulations: ENCAPSULATIONS, variables: [...variables, parameter, local] })

      expect(file.findEncapsulationDeclaration(METHOD)).toBeNull()
    })

    it("traces the uses of the name of an encapsulation", () => {
      const file = fileOf({
        encapsulations: ENCAPSULATIONS,
        variables,
        references: [reference("applyDiscount", at(17, 9)), reference("checkout", at(25, 11))],
      })

      expect(file.traceEncapsulationUsage(INNER)).toStrictEqual([{ range: at(17, 9), encapsulation: CHECKOUT, rootEncapsulation: CHECKOUT }])
      expect(file.traceEncapsulationUsage(CHECKOUT)).toStrictEqual([{ range: at(25, 11), encapsulation: METHOD, rootEncapsulation: CART }])
    })

    it("traces an encapsulation without a name of its own through the nearest one that has a name", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS, variables, references: [reference("Cart", at(11, 13))] })
      const uses = [{ range: at(11, 13), encapsulation: CHECKOUT, rootEncapsulation: CHECKOUT }]

      expect(file.traceEncapsulationUsage(METHOD)).toStrictEqual(uses)
      expect(file.traceEncapsulationUsage(INNERMOST)).toStrictEqual(uses)
    })

    it("traces no use of an encapsulation whose file declares no variable for it", () => {
      const file = fileOf({ encapsulations: ENCAPSULATIONS })

      expect(file.traceEncapsulationUsage(METHOD)).toStrictEqual([])
    })
  })

  describe("the syntax of a use", () => {
    const callee: SyntaxSite = { kind: "callee", range: range(4, 2, 4, 9) }
    const handed: SyntaxSite = { kind: "argument", range: range(4, 0, 4, 20), callee: "save", literal: null, results: [] }
    const elsewhere: SyntaxSite = { kind: "callee", range: range(9, 0, 9, 5) }

    it("lists the syntax sites that hold a range, the narrowest first", () => {
      const file = fileOf({ syntaxSites: [handed, elsewhere, callee] })

      expect(file.listSyntaxSitesAt(range(4, 2, 4, 7))).toStrictEqual([callee, handed])
    })

    it("lists the syntax sites inside a range, the widest first", () => {
      const file = fileOf({ syntaxSites: [callee, elsewhere, handed] })

      expect(file.listSyntaxSitesIn(range(4, 0, 5, 0))).toStrictEqual([handed, callee])
    })
  })

  describe("the statements of a file", () => {
    const statement = (type: Statement["type"], lines: SourceRange, statements: readonly Statement[] = []): Statement => ({
      type,
      text: type,
      range: lines,
      arms: [],
      statements,
    })
    const inside = statement("return", range(3, 2, 3, 20))
    const declared = statement("declaration", range(2, 0, 4, 1), [inside])
    const bare = statement("expression", range(6, 0, 6, 12))
    const importing = statement("import", range(1, 0, 1, 30))
    const typed = statement("type", range(8, 0, 8, 20))
    const total: Encapsulation = { name: "total", kind: "function", range: range(2, 0, 4, 1), encapsulations: [] }
    const listing: Listing = { encapsulations: [total], statements: [importing, declared, bare, typed] }

    it("lists the statements inside an encapsulation, not the one that declares it", () => {
      expect(fileOf(listing).listStatements(total)).toStrictEqual([inside])
    })

    it("lists the top level statements that run and belong to no encapsulation", () => {
      expect(fileOf(listing).listTopLevelStatements()).toStrictEqual([bare])
    })

    it("keeps the changed lines it was built with", () => {
      expect(fileOf(listing, [[3, 3], [6, 6]]).listDiffLines()).toStrictEqual([[3, 3], [6, 6]])
    })
  })

  describe("what a name stands for", () => {
    const priceOf: Encapsulation = { name: "priceOf", kind: "function", range: range(3, 0, 5, 1), encapsulations: [] }
    const listing: Listing = {
      encapsulations: [priceOf],
      variables: [variable("priceOf", at(3, 16))],
      imports: [imported("taxOf", "default", "src/pricing.ts", at(1, 7))],
      references: [reference("priceOf", at(9, 2)), reference("taxOf", at(10, 2))],
      exportAliases: [{ name: "priceOf", exportedName: "price" }, { name: "taxOf", exportedName: "tax" }],
      reExports: [
        { importedName: "roundOf", exportedName: "round", specifier: "./rounding", importedFilePath: "src/rounding.ts" },
        { importedName: NAMESPACE_IMPORT, exportedName: NAMESPACE_IMPORT, specifier: "./pricing", importedFilePath: "src/pricing.ts" },
      ],
    }

    it("finds the root encapsulation behind a name the file exports it by", () => {
      const file = fileOf(listing)

      expect([file.findExportedEncapsulation("priceOf"), file.findExportedEncapsulation("price"), file.findExportedEncapsulation("cost")]).toStrictEqual([priceOf, priceOf, null])
    })

    it("lists where a name the file only hands on comes from", () => {
      const file = fileOf(listing)

      expect(file.listReExportedSymbols("round")).toStrictEqual([
        { filePath: "src/rounding.ts", name: "roundOf" },
        { filePath: "src/pricing.ts", name: "round" },
      ])
      expect(file.listReExportedSymbols("tax")).toStrictEqual([
        { filePath: "src/pricing.ts", name: "tax" },
        { filePath: "src/pricing.ts", name: "default" },
      ])
      expect(file.listReExportedSymbols("default")).toStrictEqual([])
    })
  })
})
