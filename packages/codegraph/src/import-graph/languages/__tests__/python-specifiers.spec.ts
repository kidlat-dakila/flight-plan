import { pythonSpecifierOf, readPythonImports } from "@/import-graph/languages/python-specifiers"

describe("readPythonImports", () => {
  it.each([
    ["an import of a module", "import shop.orders", [{ module: "shop.orders", level: 0, imported: "" }]],
    ["an import under another name", "import shop.orders as orders", [{ module: "shop.orders", level: 0, imported: "" }]],
    ["an import of several modules", "import os, shop.orders as orders", [{ module: "os", level: 0, imported: "" }, { module: "shop.orders", level: 0, imported: "" }]],
    ["an import of a name", "from shop.orders import pricing", [{ module: "shop.orders", level: 0, imported: "pricing" }]],
    ["an import of a name under another name", "from shop.orders import pricing as prices", [{ module: "shop.orders", level: 0, imported: "pricing" }]],
    ["an import of several names in brackets", "from shop import (\n    orders,\n    payments as pay,\n)", [{ module: "shop", level: 0, imported: "orders" }, { module: "shop", level: 0, imported: "payments" }]],
    ["an import of everything", "from shop.orders import *", [{ module: "shop.orders", level: 0, imported: "*" }]],
    ["a relative import from the package", "from . import pricing", [{ module: "", level: 1, imported: "pricing" }]],
    ["a relative import from a sibling", "from .pricing import price_of", [{ module: "pricing", level: 1, imported: "price_of" }]],
    ["a relative import from two packages up", "from ...shop.money import round_up", [{ module: "shop.money", level: 3, imported: "round_up" }]],
    ["a relative import of everything", "from .. import *", [{ module: "", level: 2, imported: "*" }]],
  ])("reads %s", (_form, source, imports) => {
    expect(readPythonImports(source)).toStrictEqual(imports)
  })

  it("reads the imports nested in functions, classes and blocks, in the order written", () => {
    const source = [
      "import os",
      "if TYPE_CHECKING:",
      "    from .pricing import Price",
      "class Cart:",
      "    def total(self):",
      "        from . import money",
      "try:",
      "    import fast",
      "except ImportError:",
      "    import slow",
    ].join("\n")

    expect(readPythonImports(source).map((one) => one.module || one.imported)).toStrictEqual(["os", "pricing", "money", "fast", "slow"])
  })

  it.each([
    ["a future import, which names no module", "from __future__ import annotations"],
    ["a module loaded by name at run time", "pricing = importlib.import_module(\"shop.pricing\")"],
    ["a string that mentions an import", "note = \"import shop.pricing\""],
    ["a comment that mentions an import", "# import shop.pricing"],
    ["a file with no imports", "total = 1"],
    ["an empty file", ""],
  ])("reads no imports from %s", (_form, source) => {
    expect(readPythonImports(source)).toStrictEqual([])
  })

  it("reads the imports written before a syntax error", () => {
    expect(readPythonImports("from . import pricing\ndef broken(:\n")).toStrictEqual([{ module: "", level: 1, imported: "pricing" }])
  })
})

describe("pythonSpecifierOf", () => {
  it.each([
    ["a module", { module: "shop.orders", level: 0, imported: "" }, "shop.orders"],
    ["a name of a module", { module: "shop.orders", level: 0, imported: "pricing" }, "shop.orders:pricing"],
    ["a name of the package", { module: "", level: 1, imported: "pricing" }, ".:pricing"],
    ["a name of a module two packages up", { module: "orders", level: 2, imported: "pricing" }, "..orders:pricing"],
    ["everything of a module", { module: "shop.orders", level: 0, imported: "*" }, "shop.orders:*"],
  ])("names an import of %s", (_form, imported, specifier) => {
    expect(pythonSpecifierOf(imported)).toBe(specifier)
  })
})
