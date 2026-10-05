import { PYTHON_READING, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const { scopeIn, variablesIn } = PYTHON_READING

const VALUE = "inline-declaration primitive value"

describe("PythonASTGraphFile file variables", () => {
  it.each([
    ["a function", "def price_of(): pass", ["price_of: inline-declaration function value"]],
    ["a class", "class Cart: pass", ["Cart: inline-declaration class value"]],
    ["a variable", "LIMIT = 3", [`LIMIT: ${VALUE}`]],
    ["an annotated variable", "LIMIT: int = 3", [`LIMIT: ${VALUE}`]],
    ["an annotated variable without a value", "LIMIT: int", [`LIMIT: ${VALUE}`]],
    ["a variable holding a lambda", "price_of = lambda: 1", ["price_of: inline-declaration function value"]],
    ["every name of an unpacking", "total, (tax, *rest) = values", [`total: ${VALUE}`, `tax: ${VALUE}`, `rest: ${VALUE}`]],
    ["every name of an unpacking in brackets", "[first, second] = values", [`first: ${VALUE}`, `second: ${VALUE}`]],
    ["every name of a chained assignment", "first = second = 0", [`first: ${VALUE}`, `second: ${VALUE}`]],
    ["a variable first bound by an update", "total += 1", [`total: ${VALUE}`]],
    ["a variable bound inside an expression", "if (count := len(lines)) > 1: pass", [`count: ${VALUE}`]],
    ["the variables of a loop", "for index, line in lines: pass", [`index: ${VALUE}`, `line: ${VALUE}`]],
    ["the variable of a with statement", "with open(path) as handle, lock: pass", [`handle: ${VALUE}`]],
    ["the variable of an except clause", "try: pass\nexcept Failure as failure: pass", [`failure: ${VALUE}`]],
    ["the variable of a comprehension", "totals = [line.total for line in lines]", [`totals: ${VALUE}`, `line: ${VALUE}`]],
    ["a type alias", "type Price = int", ["Price: inline-declaration type value"]],
    [
      "the names a match statement captures",
      "match command:\n    case Point(x=left) | [left, *rest]: pass\n    case {'k': found, **others}: pass\n    case str() as text: pass\n    case _: pass",
      [`left: ${VALUE}`, `rest: ${VALUE}`, `found: ${VALUE}`, `others: ${VALUE}`, `text: ${VALUE}`],
    ],
    ["a name bound several times, once", "total = 0\ntotal = 1\ndef total(): pass", [`total: ${VALUE}`]],
  ])("lists %s", (_form, source, listed) => {
    expect(variablesIn(source)).toStrictEqual(listed)
  })

  it.each([
    [
      "plain, defaulted, typed, starred and keyword parameters",
      "def price_of(item, quantity=1, *rest, tax: float, rate: float = 0.2, **options): pass",
      ["item", "quantity", "rest", "tax", "rate", "options"],
    ],
    ["the parameters around the positional and keyword markers", "def add(self, /, line, *, force): pass", ["self", "line", "force"]],
    ["typed starred parameters", "def collect(*lines: Line, **options: str): pass", ["lines", "options"]],
    ["the parameters of a lambda", "price_of = lambda item, rate=2, *rest, **options: item", ["item", "rate", "rest", "options"]],
  ])("lists %s as arguments", (_form, source, names) => {
    const listed = variablesIn(source).filter((variable) => variable.includes("argument"))

    expect(listed).toStrictEqual(names.map((name) => `${name}: argument primitive value`))
  })

  it.each([
    ["a function", "def first[Item](items): pass", ["Item"]],
    ["a class", "class Box[Item]: pass", ["Item"]],
    ["a type alias", "type Box[Item] = list[Item]", ["Item"]],
    ["a function, bounded, starred and double starred", "def call[Bound: int, *Items, **Params](): pass", ["Bound", "Items", "Params"]],
  ])("lists the type parameters of %s as type arguments", (_owner, source, names) => {
    const listed = variablesIn(source).filter((variable) => variable.includes("argument type"))

    expect(listed).toStrictEqual(names.map((name) => `${name}: argument type value`))
  })

  it.each([
    ["an import", "import os\nfrom shop import pricing"],
    ["an assignment to an attribute", "cart.total = 1"],
    ["an assignment to an item", "items[0] = 1"],
    ["a use of a name", "print(total)"],
    ["a deletion", "del total"],
    ["an empty file", ""],
  ])("lists nothing for %s", (_form, source) => {
    expect(variablesIn(source)).toStrictEqual([])
  })

  it("leaves out what a class body binds", () => {
    const source = sourceOf("class Cart:", "    limit = 3", "    def add(self): pass", "    class Line: pass", "    import os")

    expect(variablesIn(source)).toStrictEqual(["Cart: inline-declaration class value", "self: argument primitive value"])
  })

  describe("scope", () => {
    it.each([
      ["a variable of the module to the file", ["LIMIT = 3", "later()"], "LIMIT", "1-2"],
      ["a variable bound in a block to the body of its function", ["def checkout():", "    if ready:", "        total = 0", "    return total", "later()"], "total", "2-4"],
      ["a parameter to the body of its function", ["def price_of(item):", "    return item", "later()"], "item", "2-2"],
      ["a function to the body of the function around it", ["def outer():", "    def inner():", "        pass", "    return inner", "later()"], "inner", "2-4"],
      ["a parameter of a lambda to the body of the lambda", ["price_of = lambda item: (", "    item.price", ")", "later()"], "item", "1-3"],
      ["a variable of a comprehension to the comprehension", ["totals = [", "    line.total for line in lines", "]", "later()"], "line", "1-3"],
      [
        "a variable bound inside a comprehension expression to the function around it",
        ["def checkout():", "    found = [last := line for line in lines]", "    return last", "later()"],
        "last",
        "2-3",
      ],
      ["a variable declared global to the file", ["def add():", "    global total", "    total = 1", "later()"], "total", "1-4"],
      [
        "a variable declared nonlocal to the body of the function around",
        ["def outer():", "    def inner():", "        nonlocal count", "        count = 1", "    return inner", "later()"],
        "count",
        "2-5",
      ],
      ["a type parameter to its function", ["LIMIT = 3", "def first[Item](items: Item):", "    return items"], "Item", "2-3"],
      ["an import in a function to the body of that function", ["def load():", "    import pricing", "    return pricing", "later()"], "pricing", "2-3"],
      ["an import of the module to the file", ["import pricing", "later()"], "pricing", "1-2"],
    ])("limits %s", (_rule, lines, name, scope) => {
      expect(scopeIn(sourceOf(...lines), name)).toBe(scope)
    })
  })
})
