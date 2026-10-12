import { blockNamed, codeOf, outlineOf, symbolsOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import { buildStoredCodeGroupGraph } from "@/code-blocks/build-group"
import type { StoredCodeBlock, StoredCodeGroupGraph } from "@/code-blocks/stored-types"

type Imports = Readonly<Record<string, Readonly<Record<string, string>>>>

const NO_IMPORTS: Imports = {}
const FILE_PATH = "shop/file.py"

const groupOf = (files: FixtureFiles, imports: Imports = NO_IMPORTS): StoredCodeGroupGraph =>
  buildStoredCodeGroupGraph(
    Object.keys(files).map((filePath) => ({
      filePath,
      source: files[filePath],
      importedFilePaths: new Map(Object.entries(imports[filePath] ?? {})),
      importedBy: Object.keys(imports).filter((importer) => Object.values(imports[importer]).includes(filePath)),
      diffs: [],
    })),
  )

const outlineOfCode = (...lines: readonly string[]): string[] => outlineOf(groupOf({ [FILE_PATH]: codeOf(...lines) }), FILE_PATH)

const handedOf = ({ outerSymbols }: StoredCodeBlock): (string | null)[] => outerSymbols.map((symbol) => symbol.handedToId ?? null)

const SHOP: FixtureFiles = {
  "shop/pricing.py": codeOf("RATE = 2", "def price_of(line):", "    return line.price * RATE"),
  "shop/__init__.py": codeOf("from shop.pricing import price_of"),
  "shop/checkout.py": codeOf(
    "import shop.pricing as pricing",
    "from shop import price_of",
    "",
    "def total_of(cart: Cart, format=str):",
    "    lines = sorted(cart.lines, key=price_of)",
    "    return format(pricing.price_of(lines[0]))",
    "",
    "def report(cart):",
    "    return total_of(cart, format=price_of)",
  ),
}
const SHOP_IMPORTS: Imports = {
  "shop/__init__.py": { "shop.pricing:price_of": "shop/pricing.py" },
  "shop/checkout.py": { "shop.pricing": "shop/pricing.py", "shop:price_of": "shop/__init__.py" },
}

describe("the blocks of a Python file", () => {
  it("makes an import, a root-variable, a function and a class of what the root of a file binds, and a type-declaration of a type alias", () => {
    expect(outlineOfCode("\"\"\"Prices.\"\"\"", "from __future__ import annotations", "import os", "RATE = 2", "type Price = int", "def price_of():", "    return RATE", "class Cart:", "    pass")).toStrictEqual([
      "import 2:1-2:35",
      "import 3:1-3:10",
      "root-variable RATE 4:1-4:9",
      "type-declaration Price 5:1-5:17",
      "function price_of 6:1-7:16",
      "class Cart 8:1-9:9",
    ])
  })

  it("makes a function of a name that keeps a lambda, and a function with no name of a lambda written in place", () => {
    expect(outlineOfCode("double = lambda value: value * 2", "def sort(lines):", "    return sorted(lines, key=lambda line: line)")).toStrictEqual([
      "function double 1:1-1:33",
      "function sort 2:1-3:48",
      "  root-argument-value lines 2:10-2:15",
      "  function 3:30-3:47",
      "    variable line 3:37-3:41",
    ])
  })

  it("starts a function at its first decorator, and names a method after its class", () => {
    expect(outlineOfCode("@cached", "@timed", "def price_of():", "    return 1", "class Cart:", "    tax = 1", "    @staticmethod", "    def empty():", "        return Cart()")).toStrictEqual([
      "function price_of 1:1-4:13",
      "class Cart 5:1-9:22",
      "  property Cart.tax 6:5-6:12",
      "  method Cart.empty 7:5-9:22",
    ])
  })

  it("makes a root-statement of every other statement at the root, with the block it is inside it", () => {
    expect(outlineOfCode("print(1)", "if __name__ == \"__main__\":", "    main()", "with open(\"a\") as handle:", "    handle.read()")).toStrictEqual([
      "root-statement 1:1-1:9",
      "root-statement 2:1-3:11",
      "  condition 2:1-3:11",
      "    call main 3:5-3:11",
      "root-statement 4:1-5:18",
      "  call handle.read 5:5-5:18",
    ])
  })

  it("makes a condition, a switch with its cases, a loop, a try-catch and a throw of the statements that are one", () => {
    const outline = outlineOfCode(
      "def check(line):",
      "    if line:",
      "        raise ValueError(\"none\")",
      "    match line:",
      "        case 1:",
      "            pass",
      "    for part in line:",
      "        pass",
      "    while line:",
      "        pass",
      "    try:",
      "        pass",
      "    except KeyError:",
      "        pass",
      "    return 1 if line else 2",
    )

    expect(outline.slice(2)).toStrictEqual([
      "  condition 2:5-3:33",
      "    throw 3:9-3:33",
      "  switch 4:5-6:17",
      "    switch-case 5:9-6:17",
      "  loop 7:5-8:13",
      "    variable part 7:9-7:13",
      "  loop 9:5-10:13",
      "  try-catch 11:5-14:13",
      "  condition 15:12-15:28",
    ])
  })

  it("makes a root-argument-value of each argument of a root function and of a method of a root class, without self, and of each member read from one", () => {
    expect(outlineOfCode("def price_of(line, *rest, rate: int = 1, **options):", "    return line.price * rate", "class Cart:", "    def total(self, lines):", "        return lines")).toStrictEqual([
      "function price_of 1:1-2:29",
      "  root-argument-value line 1:14-1:18",
      "    root-argument-value price 2:12-2:22",
      "  root-argument-value rest 1:20-1:25",
      "  root-argument-value rate 1:27-1:40",
      "  root-argument-value options 1:42-1:51",
      "class Cart 3:1-5:21",
      "  method Cart.total 4:5-5:21",
      "    root-argument-value lines 4:21-4:26",
    ])
  })

  it("makes an external-value of a name below the root that keeps what an import or a name of the root gives, and a variable of a plain local", () => {
    expect(outlineOfCode("RATE = 2", "def price_of():", "    rate = RATE * 2", "    count = 1", "    return rate * count")).toStrictEqual([
      "root-variable RATE 1:1-1:9",
      "function price_of 2:1-5:24",
      "  external-value rate 3:5-3:20",
      "  variable count 4:5-4:14",
    ])
  })

  it("gives a function the route its decorator registers, from the catalogue", () => {
    const group = groupOf({ [FILE_PATH]: codeOf("from flask import Flask", "app = Flask(__name__)", "@app.get(\"/users\")", "def list_users():", "    return []") })

    expect(blockNamed(group, "function", "list_users").catalogue).toMatchObject({ specifier: "flask", runs: "route", method: "GET", path: "/users" })
  })
})

describe("the uses of a Python file", () => {
  const group = groupOf(SHOP, SHOP_IMPORTS)

  it("says a name is called, read through a member, handed over or named as a type", () => {
    expect(symbolsOf(blockNamed(group, "function", "total_of"))).toStrictEqual([
      "call internal-code-block shop/checkout.py#root-argument-value@4:26",
      "call external-block shop/pricing.py#function@2:1",
      "value internal-code-block shop/checkout.py#external-value@5:5",
    ])
    expect(symbolsOf(blockNamed(group, "external-value", "lines"))).toStrictEqual([
      "read internal-code-block shop/checkout.py#root-argument-value@4:14 lines",
      "value external-block shop/pricing.py#function@2:1",
    ])
  })

  it("reads a member of a module imported whole as the name that module binds", () => {
    expect(blockNamed(group, "function", "price_of").usedByIds).toContain("shop/checkout.py#function@4:1")
  })

  it("hands an argument to the argument block at its position, or under its keyword", () => {
    const report = blockNamed(group, "function", "report")

    expect(symbolsOf(report)).toStrictEqual([
      "call internal-code-block shop/checkout.py#function@4:1",
      "value internal-code-block shop/checkout.py#root-argument-value@8:12",
      "value external-block shop/pricing.py#function@2:1",
    ])
    expect(handedOf(report)).toStrictEqual([null, "shop/checkout.py#root-argument-value@4:14", "shop/checkout.py#root-argument-value@4:26"])
  })

  it("exports every name the root of a file binds, and every name it imports", () => {
    expect(Object.fromEntries(group.astGraphs.map((astGraph) => [astGraph.filePath, astGraph.exports]))).toStrictEqual({
      "shop/pricing.py": { RATE: "shop/pricing.py#root-variable@1:1", price_of: "shop/pricing.py#function@2:1" },
      "shop/__init__.py": { price_of: "shop/pricing.py#function@2:1" },
      "shop/checkout.py": { total_of: "shop/checkout.py#function@4:1", report: "shop/checkout.py#function@8:1", price_of: "shop/pricing.py#function@2:1" },
    })
  })
})

describe("a method called on the receiver of a Python method", () => {
  const cart = codeOf(
    "class Cart:",
    "    def total(self):",
    "        return self.price_of(1) + self.rate",
    "",
    "    def price_of(self, line):",
    "        return line",
    "",
    "    @classmethod",
    "    def empty(cls):",
    "        return cls.total",
  )

  it("is a call of the method of that name of the class around it, and a read of it where it is not called", () => {
    const group = groupOf({ [FILE_PATH]: cart })

    expect(symbolsOf(blockNamed(group, "method", "Cart.total"))).toStrictEqual(["call internal-code-block shop/file.py#method@5:5"])
    expect(symbolsOf(blockNamed(group, "method", "Cart.empty"))).toStrictEqual(["value internal-code-block shop/file.py#method@2:5"])
  })

  it("leads a chain from the method that calls to the changed method it calls", () => {
    const group = buildStoredCodeGroupGraph([
      { filePath: FILE_PATH, source: cart, importedFilePaths: new Map<string, string>(), importedBy: [], diffs: [{ type: "modified", range: { start: { line: 6, column: 9 }, end: { line: 6, column: 20 } } }] },
    ])

    expect(blockNamed(group, "method", "Cart.total").nextBlockIds).toStrictEqual(["shop/file.py#method@5:5"])
  })
})

describe("a method a Python class inherits", () => {
  const shapes: FixtureFiles = {
    "shop/base.py": codeOf("class Priced:", "    def price_of(self, line):", "        return line"),
    "shop/taxed.py": codeOf("from shop.base import Priced", "", "class Taxed(Priced):", "    def tax(self):", "        return 0"),
    "shop/cart.py": codeOf(
      "from shop.taxed import Taxed",
      "",
      "class Cart(Taxed):",
      "    def total(self):",
      "        return self.price_of(1) + self.tax() + self.missing() + self.rate",
      "",
      "def report():",
      "    cart = Cart()",
      "    return cart.price_of(2)",
    ),
  }
  const shapeImports: Imports = {
    "shop/taxed.py": { "shop.base:Priced": "shop/base.py" },
    "shop/cart.py": { "shop.taxed:Taxed": "shop/taxed.py" },
  }
  const group = groupOf(shapes, shapeImports)
  const membersOf = ({ outerSymbols }: StoredCodeBlock): (string | null)[] => outerSymbols.map((symbol) => symbol.member?.blockId ?? null)

  it("is a call of the base the class names, with the method of that name of the nearest class that has it", () => {
    expect(membersOf(blockNamed(group, "method", "Cart.total"))).toStrictEqual(["shop/base.py#method@2:5", "shop/taxed.py#method@4:5", null, null])
  })

  it("is a read of the base too for a member of the receiver that is only read, such as an attribute no class of it declares", () => {
    const paths = blockNamed(group, "method", "Cart.total").outerSymbols.map((symbol) => symbol.member?.path)

    expect(paths).toStrictEqual([["price_of"], ["tax"], ["missing"], ["rate"]])
  })

  it("is found through an object the class makes too", () => {
    expect(membersOf(blockNamed(group, "function", "report"))).toStrictEqual(["shop/base.py#method@2:5"])
  })

  it("leads a chain from the method that calls to the changed method of a base two classes up", () => {
    const changed = buildStoredCodeGroupGraph(
      Object.keys(shapes).map((filePath) => ({
        filePath,
        source: shapes[filePath],
        importedFilePaths: new Map(Object.entries(shapeImports[filePath] ?? {})),
        importedBy: [],
        diffs: filePath === "shop/base.py" ? [{ type: "modified", range: { start: { line: 3, column: 9 }, end: { line: 3, column: 20 } } }] : [],
      })),
    )

    expect(blockNamed(changed, "method", "Cart.total").nextBlockIds).toStrictEqual(["shop/base.py#method@2:5"])
  })
})
