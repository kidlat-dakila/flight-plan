import { SCRIPT_DIALECTS, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const FILE_PATHS = { "./pricing": "src/pricing.ts" }
const PRICING = "src/pricing.ts"

describe.each(SCRIPT_DIALECTS)("%s import variables", (_dialect, { fileOf, variablesIn }) => {
  const importsIn = (source: string): string[] =>
    fileOf(source)
      .listImportVariables()
      .map(({ name, importedName, specifier }) => `${name} = ${importedName} of ${specifier}`)

  const isUsing = (name: string, ...lines: readonly string[]): boolean =>
    fileOf(sourceOf(...lines), FILE_PATHS).isFileUsingSymbol({ filePath: PRICING, name })

  it.each([
    ["a default import", "import pricing from \"./pricing\"", ["pricing = default of ./pricing"]],
    ["a namespace import", "import * as pricing from \"./pricing\"", ["pricing = * of ./pricing"]],
    ["a named import", "import { priceOf } from \"./pricing\"", ["priceOf = priceOf of ./pricing"]],
    ["a renamed import", "import { priceOf as price } from \"./pricing\"", ["price = priceOf of ./pricing"]],
    ["a default import by name", "import { default as pricing } from \"./pricing\"", ["pricing = default of ./pricing"]],
    ["an import of a quoted name", "import { \"price-of\" as priceOf } from \"./pricing\"", ["priceOf = price-of of ./pricing"]],
    [
      "a default import with named imports",
      "import pricing, { priceOf, taxOf as tax } from \"./pricing\"",
      ["pricing = default of ./pricing", "priceOf = priceOf of ./pricing", "tax = taxOf of ./pricing"],
    ],
    [
      "a default import with a namespace import",
      "import pricing, * as everything from \"./pricing\"",
      ["pricing = default of ./pricing", "everything = * of ./pricing"],
    ],
    ["a type import", "import type { Price } from \"./pricing\"", ["Price = Price of ./pricing"]],
    ["a default type import", "import type Pricing from \"./pricing\"", ["Pricing = default of ./pricing"]],
    [
      "a type among named imports",
      "import { type Price, priceOf } from \"./pricing\"",
      ["Price = Price of ./pricing", "priceOf = priceOf of ./pricing"],
    ],
    ["an import of a package", "import { useState } from \"react\"", ["useState = useState of react"]],
    ["an import assignment", "import pricing = require(\"./pricing\")", ["pricing = * of ./pricing"]],
    ["an exported import assignment", "export import pricing = require(\"./pricing\")", ["pricing = * of ./pricing"]],
    ["a required module", "const pricing = require(\"./pricing\")", ["pricing = * of ./pricing"]],
    ["a module required by a template string", "const pricing = require(`./pricing`)", ["pricing = * of ./pricing"]],
    ["a member of a required module", "const price = require(\"./pricing\").priceOf", ["price = priceOf of ./pricing"]],
    [
      "the names destructured from a required module",
      "const { priceOf, taxOf: tax, rate = 1, \"price-of\": price, ...others } = require(\"./pricing\")",
      ["priceOf = priceOf of ./pricing", "tax = taxOf of ./pricing", "rate = rate of ./pricing", "price = price-of of ./pricing", "others = * of ./pricing"],
    ],
    [
      "the names destructured below a member of a required module",
      "const { rates: { standard, reduced: low } } = require(\"./pricing\")",
      ["standard = rates of ./pricing", "low = rates of ./pricing"],
    ],
    [
      "the names destructured from a member of a required module",
      "const { parse } = require(\"./pricing\").default",
      ["parse = default of ./pricing"],
    ],
    ["the names taken from a required module by position", "const [first] = require(\"./pricing\")", ["first = * of ./pricing"]],
    ["several required modules of one statement", "var pricing = require(\"./pricing\"), tax = require(\"./tax\")", ["pricing = * of ./pricing", "tax = * of ./tax"]],
  ])("lists %s", (_form, source, listed) => {
    expect(importsIn(source)).toStrictEqual(listed)
    expect(variablesIn(source)).toStrictEqual([])
  })

  it.each([
    ["an import for its effect", "import \"./polyfill\""],
    ["a re-export of names", "export { priceOf } from \"./pricing\""],
    ["a re-export of everything", "export * from \"./pricing\""],
    ["a re-export as a namespace", "export * as pricing from \"./pricing\""],
    ["a dynamic import", "const pricing = await import(\"./pricing\")"],
    ["a module required by a computed name", "const pricing = require(name)"],
    ["a module required by a template with a substitution", `const pricing = require(\`./\${name}\`)`],
    ["a call of another function", "const pricing = load(\"./pricing\")"],
    ["a call of require with more than a path", "const pricing = require(\"./pricing\", options)"],
    ["an alias of a namespace member", "import pricing = Shop.pricing"],
  ])("lists nothing for %s", (_form, source) => {
    expect(importsIn(source)).toStrictEqual([])
  })

  it("gives the file an import was resolved to, and none for an import outside the repository", () => {
    const file = fileOf(sourceOf("import { priceOf } from \"./pricing\"", "import { useState } from \"react\""), FILE_PATHS)

    expect(file.listImportVariables().map((variable) => variable.importedFilePath)).toStrictEqual([PRICING, null])
  })

  describe("isFileUsingSymbol", () => {
    it.each([
      ["calls a named import", "priceOf", ["import { priceOf } from \"./pricing\"", "export const total = priceOf(item)"]],
      ["uses a renamed import", "priceOf", ["import { priceOf as price } from \"./pricing\"", "export const total = price(item)"]],
      ["uses a default import", "default", ["import pricing from \"./pricing\"", "pricing.priceOf(item)"]],
      ["uses a namespace import", "priceOf", ["import * as pricing from \"./pricing\"", "pricing.priceOf(item)"]],
      ["uses an imported type", "Price", ["import type { Price } from \"./pricing\"", "let price: Price"]],
      ["uses an imported class as a type only", "Cart", ["import { Cart } from \"./pricing\"", "let cart: Cart"]],
      ["exports an import again", "priceOf", ["import { priceOf } from \"./pricing\"", "export { priceOf }"]],
      ["uses a name destructured from a required module", "priceOf", ["const { priceOf: price } = require(\"./pricing\")", "price(item)"]],
      ["uses an import inside a nested function", "priceOf", ["import { priceOf } from \"./pricing\"", "const total = () => lines.map((line) => priceOf(line))"]],
    ])("says a file uses a symbol when it %s", (_reason, name, lines) => {
      expect(isUsing(name, ...lines)).toBe(true)
    })

    it.each([
      ["imports it and never uses it", "priceOf", ["import { priceOf } from \"./pricing\""]],
      ["uses another import of the file", "priceOf", ["import { priceOf, taxOf } from \"./pricing\"", "taxOf(item)"]],
      ["uses the name under which it was not imported", "price", ["import { priceOf as price } from \"./pricing\"", "price(item)"]],
      ["only uses a parameter that hides the import", "priceOf", ["import { priceOf } from \"./pricing\"", "const total = (priceOf) => priceOf(item)"]],
      ["only reads a property of that name", "priceOf", ["import { priceOf } from \"./pricing\"", "cart.priceOf(item)"]],
      ["imports that name from another file", "priceOf", ["import { priceOf } from \"./legacy\"", "priceOf(item)"]],
      ["only exports it again from the file", "priceOf", ["export { priceOf } from \"./pricing\""]],
    ])("says a file does not use a symbol when it %s", (_reason, name, lines) => {
      expect(isUsing(name, ...lines)).toBe(false)
    })
  })
})
