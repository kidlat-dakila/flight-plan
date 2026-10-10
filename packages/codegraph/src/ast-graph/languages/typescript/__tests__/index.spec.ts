import { ASTGraphFile, readTypescriptSyntax, type LineRange } from "@/ast-graph"
import { declarationOf, describeDiffLocation, describeVariable, isUsingImport, outlineOf, sourceOf, TYPESCRIPT_READING } from "@/ast-graph/languages/__tests__/script-files"
import { parseWithGrammar } from "@/ast-graph/parser"

const { usesIn } = TYPESCRIPT_READING

const SOURCE = sourceOf(
  "import { priceOf } from \"./pricing\"",
  "import type { Cart } from \"./cart\"",
  "",
  "export const TAX_RATE = 0.2",
  "",
  "export function subtotal(cart: Cart): number {",
  "  const add = (sum: number, line) => sum + priceOf(line)",
  "  return cart.lines.reduce(add, 0)",
  "}",
  "",
  "export class Checkout {",
  "  total(cart: Cart) {",
  "    return subtotal(cart) * (1 + TAX_RATE)",
  "  }",
  "}",
)

const SYNTAX = readTypescriptSyntax(parseWithGrammar("typescript", SOURCE), new Map([["./pricing", "src/pricing.ts"]]))

const checkoutFile = (diffLines: readonly LineRange[] = []): ASTGraphFile =>
  new ASTGraphFile({
    filePath: "src/checkout.ts",
    diffLines,
    syntax: SYNTAX,
  })

describe("the syntax of a file read by readTypescriptSyntax", () => {
  it("keeps what it is told about the file", () => {
    const file = checkoutFile()

    expect(file.filePath).toBe("src/checkout.ts")
  })

  it("lists the root encapsulations of the file with what is nested in them", () => {
    expect(outlineOf(SYNTAX.rootEncapsulations)).toStrictEqual([
      "variable TAX_RATE 4-4",
      "function subtotal 6-9",
      "  function add 7-7",
      "class Checkout 11-15",
      "  method total 12-14",
    ])
  })

  it("lists every variable the file declares", () => {
    expect(SYNTAX.fileVariables.map(describeVariable)).toStrictEqual([
      "TAX_RATE: inline-declaration primitive value",
      "subtotal: inline-declaration function value",
      "cart: argument primitive value",
      "add: inline-declaration function value",
      "sum: argument primitive value",
      "line: argument primitive value",
      "Checkout: inline-declaration class value+type",
      "cart: argument primitive value",
    ])
  })

  it("lists the import variables with the files they were resolved to", () => {
    const imports = SYNTAX.importVariables.map(({ name, importedName, specifier, importedFilePath }) => ({ name, importedName, specifier, importedFilePath }))

    expect(imports).toStrictEqual([
      { name: "priceOf", importedName: "priceOf", specifier: "./pricing", importedFilePath: "src/pricing.ts" },
      { name: "Cart", importedName: "Cart", specifier: "./cart", importedFilePath: null },
    ])
  })

  it("finds the root and the nearest encapsulation of a line", () => {
    const file = checkoutFile()

    expect(file.findRootEncapsulation([7, 7])?.name).toBe("subtotal")
    expect(file.findRootEncapsulation([13, 13])?.name).toBe("Checkout")
  })

  it("traces the uses of a value, a type and a parameter", () => {
    expect(usesIn(SOURCE, "TAX_RATE")).toStrictEqual(["return subtotal(cart) * (1 + «TAX_RATE»)"])
    expect(usesIn(SOURCE, "Cart")).toStrictEqual(["export function subtotal(cart: «Cart»): number {", "total(cart: «Cart») {"])
    expect(usesIn(SOURCE, "cart", 0)).toStrictEqual(["return «cart».lines.reduce(add, 0)"])
    expect(usesIn(SOURCE, "cart", 1)).toStrictEqual(["return subtotal(«cart») * (1 + TAX_RATE)"])
  })

  it("gives a use the encapsulations it sits in", () => {
    const file = checkoutFile()
    const [use] = file.traceUsage(declarationOf(SYNTAX, "priceOf"))

    expect(use.range.start.line).toBe(7)
    expect(use.encapsulation?.name).toBe("add")
    expect(use.rootEncapsulation?.name).toBe("subtotal")
  })

  it("places changed lines in the root and the nearest encapsulation", () => {
    const locations = checkoutFile([
      [7, 7],
      [13, 13],
    ]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual([
      "7-7 subtotal > add",
      "13-13 Checkout > total",
    ])
  })

  it("splits the diff of a whole file into one location per root encapsulation", () => {
    const locations = checkoutFile([[1, 15]]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual([
      "4-4 TAX_RATE > TAX_RATE",
      "6-9 subtotal > subtotal",
      "11-15 Checkout > Checkout",
    ])
  })

  it("says whether the file uses a symbol of a file it imports", () => {
    expect(isUsingImport(SYNTAX, { filePath: "src/pricing.ts", name: "priceOf" })).toBe(true)
    expect(isUsingImport(SYNTAX, { filePath: "src/pricing.ts", name: "taxOf" })).toBe(false)
    expect(isUsingImport(SYNTAX, { filePath: "src/cart.ts", name: "Cart" })).toBe(false)
  })
})
