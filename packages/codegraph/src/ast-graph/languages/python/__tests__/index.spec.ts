import { PythonASTGraphFile, type LineRange } from "@/ast-graph"
import { declarationOf, describeDiffLocation, describeVariable, outlineOf, sourceOf, usesOf } from "@/ast-graph/languages/__tests__/script-files"
import { parseWithGrammar } from "@/ast-graph/parser"

const SOURCE = sourceOf(
  "from shop.pricing import price_of",
  "from shop import tax",
  "",
  "TAX_RATE = 0.2",
  "",
  "",
  "def subtotal(cart):",
  "    add = lambda total, line: total + price_of(line)",
  "    return reduce(add, cart.lines, 0)",
  "",
  "",
  "class Checkout:",
  "    def total(self, cart):",
  "        return subtotal(cart) * (1 + TAX_RATE) + tax.of(cart)",
)

const checkoutFile = (diffLines: readonly LineRange[] = []): PythonASTGraphFile =>
  new PythonASTGraphFile({
    filePath: "shop/checkout.py",
    gitSha: "head-commit",
    tree: parseWithGrammar("python", SOURCE),
    importedBy: ["shop/page.py"],
    importsTo: ["shop/pricing.py", "shop/tax.py"],
    diffLines,
    importedFilePaths: new Map([["shop.pricing:price_of", "shop/pricing.py"], ["shop:tax", "shop/tax.py"]]),
  })

describe("PythonASTGraphFile", () => {
  it("keeps what it is told about the file", () => {
    const file = checkoutFile()

    expect(file.filePath).toBe("shop/checkout.py")
    expect(file.gitSha).toBe("head-commit")
    expect(file.importedBy).toStrictEqual(["shop/page.py"])
    expect(file.importsTo).toStrictEqual(["shop/pricing.py", "shop/tax.py"])
  })

  it("lists the root encapsulations of the file with what is nested in them", () => {
    expect(outlineOf(checkoutFile().listRootEncapsulations())).toStrictEqual([
      "variable TAX_RATE 4-4",
      "function subtotal 7-9",
      "  function add 8-8",
      "class Checkout 12-14",
      "  method total 13-14",
    ])
  })

  it("lists every variable the file declares", () => {
    expect(checkoutFile().listFileVariables().map(describeVariable)).toStrictEqual([
      "TAX_RATE: inline-declaration primitive value",
      "subtotal: inline-declaration function value",
      "cart: argument primitive value",
      "add: inline-declaration function value",
      "total: argument primitive value",
      "line: argument primitive value",
      "Checkout: inline-declaration class value",
      "self: argument primitive value",
      "cart: argument primitive value",
    ])
  })

  it("lists the import variables with the files they were resolved to", () => {
    const imports = checkoutFile()
      .listImportVariables()
      .map(({ name, importedName, specifier, importedFilePath }) => ({ name, importedName, specifier, importedFilePath }))

    expect(imports).toStrictEqual([
      { name: "price_of", importedName: "price_of", specifier: "shop.pricing:price_of", importedFilePath: "shop/pricing.py" },
      { name: "tax", importedName: "*", specifier: "shop:tax", importedFilePath: "shop/tax.py" },
    ])
  })

  it("finds the root and the nearest encapsulation of a line", () => {
    const file = checkoutFile()

    expect(file.findRootEncapsulation([8, 8])?.name).toBe("subtotal")
    expect(file.findEncapsulation([8, 8])?.name).toBe("add")
    expect(file.findEncapsulation([14, 14])?.name).toBe("total")
    expect(file.findRootEncapsulation([14, 14])?.name).toBe("Checkout")
    expect(file.findEncapsulation([10, 10])).toBeNull()
  })

  it("traces the uses of a variable, a function and two parameters of one name", () => {
    const file = checkoutFile()

    expect(usesOf(file, SOURCE, "TAX_RATE")).toStrictEqual(["return subtotal(cart) * (1 + «TAX_RATE») + tax.of(cart)"])
    expect(usesOf(file, SOURCE, "subtotal")).toStrictEqual(["return «subtotal»(cart) * (1 + TAX_RATE) + tax.of(cart)"])
    expect(usesOf(file, SOURCE, "cart", 0)).toStrictEqual(["return reduce(add, «cart».lines, 0)"])
    expect(usesOf(file, SOURCE, "cart", 1)).toStrictEqual(["return subtotal(«cart») * (1 + TAX_RATE) + tax.of(«cart»)"])
  })

  it("gives a use the encapsulations it sits in", () => {
    const file = checkoutFile()
    const [use] = file.traceUsage(declarationOf(file, "price_of"))

    expect(use.range.start.line).toBe(8)
    expect(use.encapsulation?.name).toBe("add")
    expect(use.rootEncapsulation?.name).toBe("subtotal")
  })

  it("places changed lines in the root and the nearest encapsulation", () => {
    const locations = checkoutFile([
      [8, 8],
      [14, 14],
    ]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual([
      "8-8 subtotal > add",
      "14-14 Checkout > total",
    ])
  })

  it("splits the diff of a whole file into one location per root encapsulation", () => {
    const locations = checkoutFile([[1, 14]]).listDiffLocations()

    expect(locations.map(describeDiffLocation)).toStrictEqual([
      "4-4 TAX_RATE > TAX_RATE",
      "7-9 subtotal > subtotal",
      "12-14 Checkout > Checkout",
    ])
  })

  it("says whether the file uses a symbol of a file it imports", () => {
    const file = checkoutFile()

    expect(file.isFileUsingSymbol({ filePath: "shop/pricing.py", name: "price_of" })).toBe(true)
    expect(file.isFileUsingSymbol({ filePath: "shop/pricing.py", name: "tax_of" })).toBe(false)
    expect(file.isFileUsingSymbol({ filePath: "shop/tax.py", name: "of" })).toBe(true)
  })
})
