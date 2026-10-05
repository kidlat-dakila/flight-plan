import { importerPatterns } from "@/import-graph/languages/python-importer-patterns"

const LINE_BY_LINE = "m"

const isMatched = (filePath: string, source: string): boolean =>
  importerPatterns([filePath]).some((pattern) => new RegExp(pattern, LINE_BY_LINE).test(source))

describe("importerPatterns for Python", () => {
  describe("for a module", () => {
    const pricing = "shop/orders/pricing.py"

    it.each([
      ["an import of the module by its full path", "import shop.orders.pricing"],
      ["an import of the module under another name", "import shop.orders.pricing as prices"],
      ["an import among others", "import os, shop.orders.pricing, sys"],
      ["an import of a name from the module", "from shop.orders.pricing import price_of"],
      ["an import of the module from its package", "from shop.orders import pricing"],
      ["an import of the module beside others", "from shop.orders import cart, pricing, stock"],
      ["a relative import of the module", "from . import pricing"],
      ["a relative import from the module", "from .pricing import price_of"],
      ["a relative import from a parent package", "from ..orders.pricing import price_of"],
      ["an import inside a function", "def load():\n    from shop.orders import pricing"],
      ["an import inside a type-checking block", "if TYPE_CHECKING:\n\tfrom .pricing import Price"],
      ["an import from its package that continues in brackets", "from shop.orders import (\n    cart,\n    pricing,\n)"],
      ["a relative import that continues in brackets", "from . import (\n    pricing,\n)"],
      ["an import from its package that continues after a backslash", "from shop.orders import \\\n    pricing"],
    ])("matches %s", (_form, source) => {
      expect(isMatched(pricing, source)).toBe(true)
    })

    it.each([
      ["imports a module whose name only ends the same", "from shop.orders import repricing"],
      ["imports a module whose name only starts the same", "from shop.orders import pricing_rules"],
      ["mentions the name outside an import", "total = pricing.price_of(order)"],
      ["imports another module on one line", "from shop.payments import charge"],
    ])("does not match a file that %s", (_reason, source) => {
      expect(isMatched(pricing, source)).toBe(false)
    })

    it("matches a stub file by the name of its module", () => {
      expect(isMatched("shop/orders/pricing.pyi", "from shop.orders import pricing")).toBe(true)
    })

    it("matches the importers of a module at the root of the repository", () => {
      expect(isMatched("settings.py", "import settings")).toBe(true)
      expect(isMatched("settings.py", "from . import (\n    settings,\n)")).toBe(true)
    })
  })

  describe("for the entry file of a package", () => {
    const orders = "shop/orders/__init__.py"

    it.each([
      ["an import of the package", "import shop.orders"],
      ["an import of a name from the package", "from shop.orders import place_order"],
      ["an import of the package from its parent", "from shop import orders"],
      ["an import of the package from its parent that continues in brackets", "from shop import (\n    orders,\n)"],
      ["a relative import from the package itself", "from . import place_order"],
      ["a relative import from a parent package", "from .. import place_order"],
      ["a relative import that names the package", "from ..orders import place_order"],
    ])("matches %s", (_form, source) => {
      expect(isMatched(orders, source)).toBe(true)
    })

    it("does not match an import of another package", () => {
      expect(isMatched(orders, "from shop.payments import charge")).toBe(false)
    })

    it("searches only for relative imports of an entry file at the root of the repository", () => {
      expect(importerPatterns(["__init__.py"])).toHaveLength(1)
      expect(isMatched("__init__.py", "from . import settings")).toBe(true)
    })
  })
})

describe("importerPatterns for several Python files", () => {
  const filePaths = ["shop/orders/pricing.py", "shop/payments/charge.py", "tools/__init__.py"]
  const isAnyMatched = (source: string): boolean =>
    importerPatterns(filePaths).some((pattern) => new RegExp(pattern, LINE_BY_LINE).test(source))

  it("searches for all of them with one pattern of each kind", () => {
    expect(importerPatterns(filePaths)).toHaveLength(3)
    expect(importerPatterns([])).toStrictEqual([])
  })

  it.each([
    ["the first module", "from shop.orders import pricing"],
    ["the second module", "import shop.payments.charge"],
    ["a module through its package, continued in brackets", "from shop.payments import (\n    charge,\n)"],
    ["the package of an entry file", "import tools"],
    ["a name from an entry file, relatively", "from . import run"],
  ])("matches an import of %s", (_form, source) => {
    expect(isAnyMatched(source)).toBe(true)
  })

  it("does not match a file that imports none of them", () => {
    expect(isAnyMatched("from shop.orders import repricing\nimport toolset\nfrom shop.stock import count")).toBe(false)
  })
})
