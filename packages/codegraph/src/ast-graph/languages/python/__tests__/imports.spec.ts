import { PYTHON_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const { fileOf, variablesIn } = PYTHON_READING

const PRICING = "shop/pricing.py"
const FILE_PATHS = {
  "shop.pricing": PRICING,
  "shop.tax": "shop/tax.py",
  "shop:pricing": PRICING,
  "shop.pricing:price_of": PRICING,
  "shop:orders": "shop/orders/__init__.py",
  "shop:LIMIT": "shop/__init__.py",
}

const importsIn = (source: string): string[] =>
  fileOf(source)
    .listImportVariables()
    .map(({ name, importedName, specifier }) => `${name} = ${importedName} of ${specifier}`)

const isUsing = (name: string, ...lines: readonly string[]): boolean =>
  fileOf(sourceOf(...lines), FILE_PATHS).isFileUsingSymbol({ filePath: PRICING, name })

describe("PythonASTGraphFile import variables", () => {
  it.each([
    ["an import of a module", "import pricing", ["pricing = * of pricing"]],
    ["an import of a dotted module, under its first name", "import shop.orders.pricing", ["shop = * of shop.orders.pricing"]],
    ["an import under another name", "import shop.pricing as prices", ["prices = * of shop.pricing"]],
    ["an import of several modules", "import os, shop.pricing as prices", ["os = * of os", "prices = * of shop.pricing"]],
    ["an import of a name", "from shop import pricing", ["pricing = pricing of shop:pricing"]],
    ["an import of a name under another name", "from shop.pricing import price_of as price", ["price = price_of of shop.pricing:price_of"]],
    [
      "an import of several names in brackets",
      "from shop import (\n    orders,\n    payments as pay,\n)",
      ["orders = orders of shop:orders", "pay = payments of shop:payments"],
    ],
    ["a relative import from the package", "from . import pricing", ["pricing = pricing of .:pricing"]],
    ["a relative import from a module", "from .pricing import price_of", ["price_of = price_of of .pricing:price_of"]],
    ["a relative import from two packages up", "from ..orders import pricing", ["pricing = pricing of ..orders:pricing"]],
    ["two modules of one package", "import shop.tax\nimport shop.pricing", ["shop = * of shop.tax", "shop = * of shop.pricing"]],
    [
      "an import with a fallback",
      "try:\n    import simplejson as json\nexcept ImportError:\n    import json",
      ["json = * of simplejson", "json = * of json"],
    ],
    ["an import whose name is bound again later", "import json\njson = None", ["json = * of json"]],
  ])("lists %s", (_form, source, listed) => {
    expect(importsIn(source)).toStrictEqual(listed)
    expect(variablesIn(source)).toStrictEqual([])
  })

  it.each([
    ["an import of everything", "from shop.pricing import *"],
    ["a future import", "from __future__ import annotations"],
    ["a module loaded by a call", "pricing = importlib.import_module('pricing')"],
    ["an import of a name that was bound before", "json = None\nimport json"],
    ["an import in a class body", "class Cart:\n    import json"],
  ])("lists nothing for %s", (_form, source) => {
    expect(importsIn(source)).toStrictEqual([])
  })

  it("gives the file an import was resolved to, and reads a name that is a module as the whole module", () => {
    const file = fileOf(sourceOf("from shop import pricing, orders, LIMIT", "from shop.pricing import price_of", "import os"), FILE_PATHS)

    expect(file.listImportVariables().map(({ name, importedName, importedFilePath }) => [name, importedName, importedFilePath])).toStrictEqual([
      ["pricing", "*", PRICING],
      ["orders", "*", "shop/orders/__init__.py"],
      ["LIMIT", "LIMIT", "shop/__init__.py"],
      ["price_of", "price_of", PRICING],
      ["os", "*", null],
    ])
  })

  describe("isFileUsingSymbol", () => {
    it.each([
      ["calls a name it imports", "price_of", ["from shop.pricing import price_of", "total = price_of(item)"]],
      ["uses a name it imports under another name", "price_of", ["from shop.pricing import price_of as price", "total = price(item)"]],
      ["uses a module it imports", "price_of", ["import shop.pricing", "shop.pricing.price_of(item)"]],
      ["uses a module it imports from a package", "price_of", ["from shop import pricing", "pricing.price_of(item)"]],
      ["uses a package it imports two modules of", "price_of", ["import shop.pricing", "import shop.tax", "shop.tax.rate()"]],
      ["uses an import inside a function", "price_of", ["from shop.pricing import price_of", "def total(item):", "    return price_of(item)"]],
    ])("says a file uses a symbol when it %s", (_reason, name, lines) => {
      expect(isUsing(name, ...lines)).toBe(true)
    })

    it.each([
      ["imports it and never uses it", "price_of", ["from shop.pricing import price_of"]],
      ["uses the name under which it was not imported", "price", ["from shop.pricing import price_of as price", "price(item)"]],
      ["only uses a parameter that hides the import", "price_of", ["from shop.pricing import price_of", "def total(price_of):", "    return price_of()"]],
      ["only reads an attribute of that name", "price_of", ["from shop.pricing import price_of", "cart.price_of(item)"]],
      ["imports that name from another module", "price_of", ["from shop.legacy import price_of", "price_of(item)"]],
    ])("says a file does not use a symbol when it %s", (_reason, name, lines) => {
      expect(isUsing(name, ...lines)).toBe(false)
    })
  })
})
