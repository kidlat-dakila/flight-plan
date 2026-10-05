import { TypescriptASTGraphFile } from "@/ast-graph"
import { parseWithGrammar } from "@/ast-graph/parser"
import { declarationOf, describeVariable, outlineOf, sourceOf, usesIn } from "./typescript-file"

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

const checkoutFile = (): TypescriptASTGraphFile =>
  new TypescriptASTGraphFile({
    filePath: "src/checkout.ts",
    gitSha: "head-commit",
    tree: parseWithGrammar("typescript", SOURCE),
    importedBy: ["src/page.ts"],
    importsTo: ["src/pricing.ts"],
    importedFilePaths: new Map([["./pricing", "src/pricing.ts"]]),
  })

describe("TypescriptASTGraphFile", () => {
  it("keeps what it is told about the file", () => {
    const file = checkoutFile()

    expect(file.filePath).toBe("src/checkout.ts")
    expect(file.gitSha).toBe("head-commit")
    expect(file.importedBy).toStrictEqual(["src/page.ts"])
    expect(file.importsTo).toStrictEqual(["src/pricing.ts"])
  })

  it("lists the root encapsulations of the file with what is nested in them", () => {
    expect(outlineOf(checkoutFile().listRootEncapsulations())).toStrictEqual([
      "variable TAX_RATE 4-4",
      "function subtotal 6-9",
      "  function add 7-7",
      "class Checkout 11-15",
      "  method total 12-14",
    ])
  })

  it("lists every variable the file declares", () => {
    expect(checkoutFile().listFileVariables().map(describeVariable)).toStrictEqual([
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
    const imports = checkoutFile()
      .listImportVariables()
      .map(({ name, importedName, specifier, importedFilePath }) => ({ name, importedName, specifier, importedFilePath }))

    expect(imports).toStrictEqual([
      { name: "priceOf", importedName: "priceOf", specifier: "./pricing", importedFilePath: "src/pricing.ts" },
      { name: "Cart", importedName: "Cart", specifier: "./cart", importedFilePath: null },
    ])
  })

  it("finds the root and the nearest encapsulation of a line", () => {
    const file = checkoutFile()

    expect(file.findRootEncapsulation([7, 7])?.name).toBe("subtotal")
    expect(file.findEncapsulation([7, 7])?.name).toBe("add")
    expect(file.findEncapsulation([13, 13])?.name).toBe("total")
    expect(file.findRootEncapsulation([13, 13])?.name).toBe("Checkout")
    expect(file.findEncapsulation([10, 10])).toBeNull()
  })

  it("traces the uses of a value, a type and a parameter", () => {
    expect(usesIn(SOURCE, "TAX_RATE")).toStrictEqual(["return subtotal(cart) * (1 + «TAX_RATE»)"])
    expect(usesIn(SOURCE, "Cart")).toStrictEqual(["export function subtotal(cart: «Cart»): number {", "total(cart: «Cart») {"])
    expect(usesIn(SOURCE, "cart", 0)).toStrictEqual(["return «cart».lines.reduce(add, 0)"])
    expect(usesIn(SOURCE, "cart", 1)).toStrictEqual(["return subtotal(«cart») * (1 + TAX_RATE)"])
  })

  it("gives a use the encapsulations it sits in", () => {
    const file = checkoutFile()
    const [use] = file.traceUsage(declarationOf(file, "priceOf"))

    expect(use.range.start.line).toBe(7)
    expect(use.encapsulation?.name).toBe("add")
    expect(use.rootEncapsulation?.name).toBe("subtotal")
  })

  it("says whether the file uses a symbol of a file it imports", () => {
    const file = checkoutFile()

    expect(file.isFileUsingSymbol({ filePath: "src/pricing.ts", name: "priceOf" })).toBe(true)
    expect(file.isFileUsingSymbol({ filePath: "src/pricing.ts", name: "taxOf" })).toBe(false)
    expect(file.isFileUsingSymbol({ filePath: "src/cart.ts", name: "Cart" })).toBe(false)
  })
})
