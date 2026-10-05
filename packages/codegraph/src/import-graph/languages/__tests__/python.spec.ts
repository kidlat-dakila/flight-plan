import { createFakeGitAdapter, HEAD_COMMIT, type FakeFiles } from "@/import-graph/__tests__/fake-git-adapter"
import type { ImportReader } from "@/import-graph/languages/language"
import { pythonImportLanguage } from "@/import-graph/languages/python"
import { readRepositorySnapshot } from "@/import-graph/repository-snapshot"

const readerOf = async (files: FakeFiles): Promise<ImportReader> => {
  const gitAdapter = createFakeGitAdapter({ base: {}, head: files })
  return pythonImportLanguage.createImportReader(await readRepositorySnapshot(gitAdapter, HEAD_COMMIT))
}

const SHOP: FakeFiles = {
  "shop/__init__.py": "",
  "shop/settings.py": "",
  "shop/orders/__init__.py": "",
  "shop/orders/pricing.py": "",
  "shop/orders/cart.py": "",
  "shop/orders/stock.pyi": "",
  "shop/payments/__init__.py": "",
  "shop/payments/charge.py": "",
}

const importsOf = async (source: string, importer = "shop/orders/checkout.py"): Promise<readonly string[]> => {
  const reader = await readerOf({ ...SHOP, [importer]: source })
  return await reader.importsOf(importer)
}

describe("the Python import language", () => {
  it("covers Python files and their stubs", () => {
    expect(pythonImportLanguage.extensions).toStrictEqual([".py", ".pyi"])
  })

  describe("importsOf", () => {
    it.each([
      ["an import of a module", "import shop.orders.pricing", ["shop/orders/pricing.py"]],
      ["an import of a module under another name", "import shop.orders.pricing as prices", ["shop/orders/pricing.py"]],
      ["an import of a package", "import shop.payments", ["shop/payments/__init__.py"]],
      ["an import of several modules", "import shop.settings, shop.orders.cart", ["shop/orders/cart.py", "shop/settings.py"]],
      ["an import of a name from a module", "from shop.orders.pricing import price_of", ["shop/orders/pricing.py"]],
      ["an import of a name under another name", "from shop.orders.pricing import price_of as price", ["shop/orders/pricing.py"]],
      ["an import of a name from a package", "from shop.payments import refund", ["shop/payments/__init__.py"]],
      ["an import of a module from a package", "from shop.payments import charge", ["shop/payments/charge.py"]],
      ["an import of modules in brackets", "from shop.orders import (\n    cart,\n    pricing,\n)", ["shop/orders/cart.py", "shop/orders/pricing.py"]],
      ["an import of everything from a module", "from shop.orders.pricing import *", ["shop/orders/pricing.py"]],
      ["a relative import of a sibling module", "from . import pricing", ["shop/orders/pricing.py"]],
      ["a relative import from a sibling module", "from .pricing import price_of", ["shop/orders/pricing.py"]],
      ["a relative import of a name from the package itself", "from . import place_order", ["shop/orders/__init__.py"]],
      ["a relative import from the parent package", "from .. import settings", ["shop/settings.py"]],
      ["a relative import from a module of the parent package", "from ..payments.charge import charge", ["shop/payments/charge.py"]],
      ["an import of a stub file", "from shop.orders import stock", ["shop/orders/stock.pyi"]],
      ["an import inside a function", "def load():\n    from shop.orders import pricing\n    return pricing", ["shop/orders/pricing.py"]],
      ["an import inside a class", "class Checkout:\n    from shop.orders import cart", ["shop/orders/cart.py"]],
      ["an import inside a type-checking block", "from typing import TYPE_CHECKING\nif TYPE_CHECKING:\n    from .pricing import Price", ["shop/orders/pricing.py"]],
      ["both imports of a try block", "try:\n    from . import pricing\nexcept ImportError:\n    from . import cart", ["shop/orders/cart.py", "shop/orders/pricing.py"]],
    ])("resolves %s", async (_form, source, resolved) => {
      expect(await importsOf(source)).toStrictEqual(resolved)
    })

    it.each([
      ["the standard library", "import os\nfrom pathlib import Path"],
      ["a package that is not in the repository", "import requests\nfrom django.db import models"],
      ["a future import", "from __future__ import annotations"],
      ["a module that does not exist", "from shop.absent import missing\nimport shop.absent"],
      ["a relative import that climbs out of the repository", "from ..... import settings"],
      ["a module loaded by name at run time", "import importlib\npricing = importlib.import_module(\"shop.orders.pricing\")"],
      ["a module loaded with __import__", "pricing = __import__(\"shop.orders.pricing\")"],
      ["a string that mentions an import", "note = \"from shop.orders import pricing\""],
      ["a comment that mentions an import", "# from shop.orders import pricing"],
    ])("leaves out %s", async (_form, source) => {
      expect(await importsOf(source)).toStrictEqual([])
    })

    it("lists a file once, however many times it is imported", async () => {
      expect(await importsOf("import shop.orders.pricing\nfrom .pricing import price_of\nfrom . import pricing")).toStrictEqual([
        "shop/orders/pricing.py",
      ])
    })

    it("leaves out a file's import of itself", async () => {
      expect(await importsOf("from . import place_order", "shop/orders/__init__.py")).toStrictEqual([])
    })

    it("resolves a package without an entry file", async () => {
      const reader = await readerOf({
        "tools/reports/monthly.py": "",
        "tools/run.py": "from tools.reports import monthly\nimport tools.reports.monthly",
      })

      expect(await reader.importsOf("tools/run.py")).toStrictEqual(["tools/reports/monthly.py"])
    })

    it("resolves from the src folder of a project that keeps its packages there", async () => {
      const reader = await readerOf({
        "pyproject.toml": "[tool.setuptools.package-dir]\n\"\" = \"src\"\n",
        "src/shop/__init__.py": "",
        "src/shop/pricing.py": "",
        "tests/test_pricing.py": "from shop.pricing import price_of",
      })

      expect(await reader.importsOf("tests/test_pricing.py")).toStrictEqual(["src/shop/pricing.py"])
    })

    it("resolves a package of another project of a monorepo", async () => {
      const reader = await readerOf({
        "libs/money/pyproject.toml": "[project]\nname = \"money\"\n",
        "libs/money/money/__init__.py": "",
        "libs/money/money/rounding.py": "",
        "services/shop/pyproject.toml": "[project]\nname = \"shop\"\n",
        "services/shop/shop/pricing.py": "from money.rounding import round_half_up\nimport money",
      })

      expect(await reader.importsOf("services/shop/shop/pricing.py")).toStrictEqual([
        "libs/money/money/__init__.py",
        "libs/money/money/rounding.py",
      ])
    })

    it("reads the imports written before a syntax error", async () => {
      expect(await importsOf("from . import pricing\ndef broken(:\n")).toStrictEqual(["shop/orders/pricing.py"])
    })

    it("has no imports for a file that is not in the commit", async () => {
      const reader = await readerOf(SHOP)

      expect(await reader.importsOf("shop/absent.py")).toStrictEqual([])
    })
  })
})
