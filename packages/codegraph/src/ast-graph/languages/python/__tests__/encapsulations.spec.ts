import { PYTHON_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const { fileOf, outlineIn } = PYTHON_READING

describe("PythonASTGraphFile root encapsulations", () => {
  it("lists the first layer of a file, each with what is nested in it", () => {
    const source = sourceOf(
      "SOME_CONSTANT = 1",
      "",
      "def some_function():",
      "    def some_inner_function():",
      "        pass",
      "",
      "class SomeClass:",
      "    def some_method(self):",
      "        pass",
    )

    expect(outlineIn(source)).toStrictEqual([
      "variable SOME_CONSTANT 1-1",
      "function some_function 3-5",
      "  function some_inner_function 4-5",
      "class SomeClass 7-9",
      "  method some_method 8-9",
    ])
  })

  it.each([
    ["a function", "def price_of(): pass", ["function price_of 1-1"]],
    ["an async function", "async def price_of(): pass", ["function price_of 1-1"]],
    ["a class", "class Cart: pass", ["class Cart 1-1"]],
    ["a variable", "LIMIT = 3", ["variable LIMIT 1-1"]],
    ["an annotated variable", "LIMIT: int = 3", ["variable LIMIT 1-1"]],
    ["an annotated variable without a value", "LIMIT: int", ["variable LIMIT 1-1"]],
    ["a variable holding a lambda", "price_of = lambda item: 1", ["function price_of 1-1"]],
    ["every name of an unpacking", "total, (tax, *rest) = values", ["variable total 1-1", "variable tax 1-1", "variable rest 1-1"]],
    ["every name of a chained assignment", "first = second = 0", ["variable first 1-1", "variable second 1-1"]],
  ])("lists %s", (_form, source, listed) => {
    expect(outlineIn(source)).toStrictEqual(listed)
  })

  it.each([
    ["an import", "import os"],
    ["an import of a name", "from shop import pricing"],
    ["a call", "print(1)"],
    ["an update of a variable", "LIMIT += 1"],
    ["an assignment to an attribute", "cart.total = 1"],
    ["an assignment to an item", "items[0] = 1"],
    ["a type alias", "type Price = int"],
    ["a function declared inside a block", "if ready:\n    def price_of(): pass"],
    ["an empty file", ""],
  ])("lists nothing for %s", (_form, source) => {
    expect(outlineIn(source)).toStrictEqual([])
  })

  it("covers the decorators of a function, a class and a method", () => {
    const source = sourceOf(
      "@app.route('/cart')",
      "@cached",
      "def cart():",
      "    pass",
      "@dataclass",
      "class Cart:",
      "    @property",
      "    def total(self):",
      "        return 1",
    )

    expect(outlineIn(source)).toStrictEqual(["function cart 1-4", "class Cart 5-9", "  method total 7-9"])
  })

  it("nests the functions and classes declared inside a function, at every depth", () => {
    const source = sourceOf(
      "def checkout(cart):",
      "    def subtotal():",
      "        price_of = lambda line: 1",
      "        return 1",
      "    if cart.coupon:",
      "        def discount(): pass",
      "    class Receipt:",
      "        def print(self): pass",
      "        format = lambda self: 1",
      "        class Line: pass",
      "    rate = 2",
      "    return subtotal()",
    )

    expect(outlineIn(source)).toStrictEqual([
      "function checkout 1-12",
      "  function subtotal 2-4",
      "    function price_of 3-3",
      "  function discount 6-6",
      "  class Receipt 7-10",
      "    method print 8-8",
      "    method format 9-9",
      "    class Line 10-10",
    ])
  })

  it("lists a function declared inside a method as a function", () => {
    const source = sourceOf("class Cart:", "    def total(self):", "        def add(line): pass")

    expect(outlineIn(source)).toStrictEqual(["class Cart 1-3", "  method total 2-3", "    function add 3-3"])
  })

  it("finds the root and the nearest encapsulation of the lines of a real file", () => {
    const file = fileOf(sourceOf("def checkout(cart):", "    def subtotal():", "        return 1", "    return subtotal()", "", "print(checkout)"))

    expect(file.findRootEncapsulation([3, 3])?.name).toBe("checkout")
  })
})
