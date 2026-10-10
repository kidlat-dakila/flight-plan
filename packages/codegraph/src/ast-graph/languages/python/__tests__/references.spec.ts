import { declarationOf, PYTHON_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const { fileOf, syntaxOf, usesIn } = PYTHON_READING

describe("PythonASTGraphFile traceUsage", () => {
  it.each([
    ["a call", ["def price_of(): pass", "price_of()"], "price_of", ["«price_of»()"]],
    ["an argument and the value of a keyword argument", ["rate = 2", "apply(rate, factor=rate)"], "rate", ["apply(«rate», factor=«rate»)"]],
    ["an assignment and an update after the first", ["total = 0", "total = 1", "total += 2"], "total", ["«total» = 1", "«total» += 2"]],
    ["a second definition of the name", ["def price_of(): pass", "def price_of(): return 1", "price_of()"], "price_of", ["def «price_of»(): return 1", "«price_of»()"]],
    ["the object of an attribute", ["cart = {}", "cart.total.amount"], "cart", ["«cart».total.amount"]],
    ["an item read and written", ["lines = []", "lines[0] = lines[1]"], "lines", ["«lines»[0] = «lines»[1]"]],
    ["a formatted string", ["rate = 2", "label = f\"{rate}%\""], "rate", ["label = f\"{«rate»}%\""]],
    ["the default of a parameter", ["rate = 2", "def tax(amount, factor=rate): pass"], "rate", ["def tax(amount, factor=«rate»): pass"]],
    ["a decorator", ["def logged(run): pass", "@logged", "def run(): pass"], "logged", ["@«logged»"]],
    ["a base class", ["class Basket: pass", "class Cart(Basket): pass"], "Basket", ["class Cart(«Basket»): pass"]],
    [
      "an annotation",
      ["class Cart: pass", "def total(cart: Cart) -> Cart: pass", "found: Cart = None"],
      "Cart",
      ["def total(cart: «Cart») -> «Cart»: pass", "found: «Cart» = None"],
    ],
    ["a type parameter", ["def first[Item](items: list[Item]) -> Item: pass"], "Item", ["def first[Item](items: list[«Item»]) -> «Item»: pass"]],
    ["a deletion", ["total = 0", "del total"], "total", ["del «total»"]],
    ["the source of a comprehension", ["lines = []", "totals = [line for line in lines]"], "lines", ["totals = [line for line in «lines»]"]],
    ["the class of a match pattern", ["class Point: pass", "match shape:", "    case Point(x=0): pass"], "Point", ["case «Point»(x=0): pass"]],
    ["the object of a match value", ["class Color: pass", "match shade:", "    case Color.RED: pass"], "Color", ["case «Color».RED: pass"]],
    ["an exception caught", ["class Failure(Exception): pass", "try: pass", "except Failure as failure: pass"], "Failure", ["except «Failure» as failure: pass"]],
    [
      "a closure of a nested function",
      ["def checkout(cart):", "    def subtotal():", "        return cart.total", "    return subtotal"],
      "cart",
      ["return «cart».total"],
    ],
    [
      "a function that declares the name global",
      ["total = 0", "def add():", "    global total", "    total += 1", "    return total"],
      "total",
      ["«total» += 1", "return «total»"],
    ],
    [
      "a function that declares the name nonlocal",
      ["def counter():", "    count = 0", "    def add():", "        nonlocal count", "        count += 1", "    return add"],
      "count",
      ["«count» += 1"],
    ],
  ])("finds a use in %s", (_form, lines, name, uses) => {
    expect(usesIn(sourceOf(...lines), name)).toStrictEqual(uses)
  })

  it.each([
    ["an attribute of that name", ["total = 1", "cart.total"], "total"],
    ["the name of a keyword argument", ["rate = 1", "apply(rate=2)"], "rate"],
    ["a method of that name", ["total = 1", "class Cart:", "    def total(self): pass"], "total"],
    ["a class attribute of that name", ["total = 1", "class Cart:", "    total = 2"], "total"],
    ["a class attribute read in its class body", ["total = 1", "class Cart:", "    total = 2", "    double = total * 2"], "total"],
    ["the keyword of a match pattern", ["x = 1", "match point:", "    case Point(x=0): pass"], "x"],
    ["the member of a match value", ["RED = 1", "match shade:", "    case Color.RED: pass"], "RED"],
    ["an annotation written as a string", ["class Cart: pass", "def total(cart: \"Cart\"): pass"], "Cart"],
    ["an import of that name from elsewhere in a class body", ["json = 1", "class Cart:", "    import json"], "json"],
    ["its own declaration", ["total = 1"], "total"],
  ])("does not count %s as a use", (_form, lines, name) => {
    expect(usesIn(sourceOf(...lines), name)).toStrictEqual([])
  })

  describe("scopes", () => {
    it("gives a use to the parameter that hides an outer variable", () => {
      const source = sourceOf("total = 1", "def checkout(total):", "    return total", "report(total)")

      expect(usesIn(source, "total", 0)).toStrictEqual(["report(«total»)"])
      expect(usesIn(source, "total", 1)).toStrictEqual(["return «total»"])
    })

    it("gives every use in a function to the variable the function binds, even before it is bound", () => {
      const source = sourceOf("rate = 1", "def tax():", "    first(rate)", "    rate = 2", "last(rate)")

      expect(usesIn(source, "rate", 0)).toStrictEqual(["last(«rate»)"])
      expect(usesIn(source, "rate", 1)).toStrictEqual(["first(«rate»)"])
    })

    it("finds the uses of a variable bound in a block after the block", () => {
      const source = sourceOf("def checkout():", "    if ready:", "        total = 1", "    return total")

      expect(usesIn(source, "total")).toStrictEqual(["return «total»"])
    })

    it("finds the uses of a loop variable after the loop", () => {
      expect(usesIn(sourceOf("for line in lines: pass", "use(line)"), "line")).toStrictEqual(["use(«line»)"])
    })

    it("keeps the variable of a comprehension inside it", () => {
      const source = sourceOf("line = 1", "totals = [line for line in lines]", "use(line)")

      expect(usesIn(source, "line", 0)).toStrictEqual(["use(«line»)"])
      expect(usesIn(source, "line", 1)).toStrictEqual(["totals = [«line» for line in lines]"])
    })

    it("keeps the parameter of a lambda inside it", () => {
      const source = sourceOf("item = 1", "price_of = lambda item: item.price", "use(item)")

      expect(usesIn(source, "item", 0)).toStrictEqual(["use(«item»)"])
      expect(usesIn(source, "item", 1)).toStrictEqual(["price_of = lambda item: «item».price"])
    })

    it("reads a name in a method from the module, not from the class attribute of that name", () => {
      const source = sourceOf("limit = 1", "class Cart:", "    limit = 2", "    def over(self):", "        return limit")

      expect(usesIn(source, "limit")).toStrictEqual(["return «limit»"])
    })

    it("reads the default of a parameter outside the function", () => {
      const source = sourceOf("amount = 1", "def tax(amount=amount):", "    return amount")

      expect(usesIn(source, "amount", 0)).toStrictEqual(["def tax(amount=«amount»):"])
      expect(usesIn(source, "amount", 1)).toStrictEqual(["return «amount»"])
    })
  })

  it("traces from a use of a name to every use of its declaration", () => {
    const source = sourceOf("rate = 2", "apply(rate)", "print(rate)")
    const file = fileOf(source)
    const uses = file.traceUsage(declarationOf(syntaxOf(source), "rate"))

    expect(uses).toHaveLength(2)
    expect(file.traceUsage({ name: "rate", range: uses[1].range })).toStrictEqual(uses)
  })

  it("finds no uses of a name the file does not declare", () => {
    const file = fileOf("print(total)")

    expect(file.traceUsage({ name: "print", range: { start: { line: 1, column: 0 }, end: { line: 1, column: 5 } } })).toStrictEqual([])
  })
})
