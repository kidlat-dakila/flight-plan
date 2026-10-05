import { declarationOf, sourceOf, typescriptFileOf, usesIn } from "./typescript-file"

describe("TypescriptASTGraphFile traceUsage", () => {
  it.each([
    ["a call", ["function priceOf() {}", "priceOf()"], "priceOf", ["«priceOf»()"]],
    ["a call above the declaration", ["priceOf()", "function priceOf() {}"], "priceOf", ["«priceOf»()"]],
    ["a call of itself", ["function walk() {", "  walk()", "}"], "walk", ["«walk»()"]],
    ["an argument", ["const rate = 2", "apply(rate)"], "rate", ["apply(«rate»)"]],
    ["an assignment and an update", ["let total = 0", "total = 1", "total += 2", "total++"], "total", ["«total» = 1", "«total» += 2", "«total»++"]],
    ["a shorthand property", ["const rate = 2", "const cart = { rate }"], "rate", ["const cart = { «rate» }"]],
    ["a property value and a computed key", ["const rate = 2", "const cart = { [rate]: rate }"], "rate", ["const cart = { [«rate»]: «rate» }"]],
    ["a spread", ["const rates = []", "const all = [...rates, { ...rates }]"], "rates", ["const all = [...«rates», { ...«rates» }]"]],
    ["a template string", ["const rate = 2", `const label = \`rate: \${rate}\``], "rate", [`const label = \`rate: \${«rate»}\``]],
    ["the default of a parameter", ["const rate = 2", "function tax(amount, factor = rate) {}"], "rate", ["function tax(amount, factor = «rate») {}"]],
    ["the default of a destructuring", ["const rate = 2", "const { factor = rate } = options"], "rate", ["const { factor = «rate» } = options"]],
    ["a computed key of a destructuring", ["const key = 'rate'", "const { [key]: factor } = options"], "key", ["const { [«key»]: factor } = options"]],
    ["the object of a member access", ["const cart = {}", "cart.total.amount"], "cart", ["«cart».total.amount"]],
    ["a decorator", ["function Logged() {}", "@Logged()", "class Cart {}"], "Logged", ["@«Logged»()"]],
    ["a class extended", ["class Basket {}", "class Cart extends Basket {}"], "Basket", ["class Cart extends «Basket» {}"]],
    ["a construction", ["class Cart {}", "new Cart()"], "Cart", ["new «Cart»()"]],
    ["a type query", ["const cart = {}", "type Cart = keyof typeof cart"], "cart", ["type Cart = keyof typeof «cart»"]],
    [
      "a type annotation",
      ["interface Cart {}", "let cart: Cart", "function total(given: Cart): Cart {}"],
      "Cart",
      ["let cart: «Cart»", "function total(given: «Cart»): «Cart» {}"],
    ],
    ["a type argument", ["interface Cart {}", "const carts = new Map<string, Cart[]>()"], "Cart", ["const carts = new Map<string, «Cart»[]>()"]],
    [
      "an interface implemented and extended",
      ["interface Priced {}", "class Cart implements Priced {}", "interface Sale extends Priced {}"],
      "Priced",
      ["class Cart implements «Priced» {}", "interface Sale extends «Priced» {}"],
    ],
    [
      "a cast",
      ["interface Cart {}", "const cart = {} as Cart", "const other = {} satisfies Cart"],
      "Cart",
      ["const cart = {} as «Cart»", "const other = {} satisfies «Cart»"],
    ],
    ["the constraint of a type parameter", ["interface Cart {}", "function total<Given extends Cart = Cart>() {}"], "Cart", ["function total<Given extends «Cart» = «Cart»>() {}"]],
    ["a type predicate", ["function isCart(given: unknown): given is Cart {", "}"], "given", ["function isCart(given: unknown): «given» is Cart {"]],
    ["the namespace of a qualified type", ["namespace Shop {}", "let cart: Shop.Cart"], "Shop", ["let cart: «Shop».Cart"]],
    ["an alias of a namespace member", ["namespace Shop {}", "import cart = Shop.cart"], "Shop", ["import cart = «Shop».cart"]],
    ["an enum as a type and as a value", ["enum Status { Open }", "let status: Status = Status.Open"], "Status", ["let status: «Status» = «Status».Open"]],
    ["an export of names", ["const rate = 2", "export { rate, rate as factor }"], "rate", ["export { «rate», «rate» as factor }"]],
    ["a default export", ["const rate = 2", "export default rate"], "rate", ["export default «rate»"]],
    ["an export assignment", ["const rate = 2", "export = rate"], "rate", ["export = «rate»"]],
    [
      "the target of a destructuring assignment",
      ["let rate = 2", "({ rate, factor: rate = 1 } = options)", "[rate] = factors"],
      "rate",
      ["({ «rate», factor: «rate» = 1 } = options)", "[«rate»] = factors"],
    ],
    ["the target of a loop that declares nothing", ["let name", "for (name in names) {}"], "name", ["for («name» in names) {}"]],
    [
      "a closure of a nested function",
      ["function checkout(cart) {", "  return cart.lines.map((line) => line.price * cart.rate)", "}"],
      "cart",
      ["return «cart».lines.map((line) => line.price * «cart».rate)"],
    ],
  ])("finds a use in %s", (_form, lines, name, uses) => {
    expect(usesIn(sourceOf(...lines), name)).toStrictEqual(uses)
  })

  it.each([
    ["a property of that name", ["const total = 1", "cart.total"], "total"],
    ["a key of an object", ["const total = 1", "const cart = { total: 2 }"], "total"],
    ["a method of that name", ["const total = 1", "class Cart { total() {} }"], "total"],
    ["a field of that name", ["const total = 1", "class Cart { total = 2 }"], "total"],
    ["a property of an interface", ["const total = 1", "interface Cart { total: number }"], "total"],
    ["a member of an enum", ["const Open = 1", "enum Status { Open }"], "Open"],
    ["a key of a destructuring", ["const total = 1", "const { total: amount } = cart"], "total"],
    ["a label", ["const outer = 1", "outer: for (;;) { break outer }"], "outer"],
    ["a label of a tuple", ["const first = 1", "type Pair = [first: string, ...first: string[]]"], "first"],
    ["a re-export of that name", ["const priceOf = 1", "export { priceOf } from \"./pricing\""], "priceOf"],
    ["a re-export under that name", ["const pricing = 1", "export * as pricing from \"./pricing\""], "pricing"],
    ["the name something else is exported under", ["const factor = 1", "const rate = 2", "export { rate as factor }"], "factor"],
    ["the global name of a module", ["const Shop = 1", "export as namespace Shop"], "Shop"],
    ["a member of a qualified type", ["interface Cart {}", "let cart: Shop.Cart"], "Cart"],
    ["the signatures of its overloads", ["function priceOf(item: Item): number", "function priceOf(given) {}"], "priceOf"],
    ["its own declaration", ["const total = 1"], "total"],
  ])("does not count %s as a use", (_form, lines, name) => {
    expect(usesIn(sourceOf(...lines), name)).toStrictEqual([])
  })

  describe("scopes", () => {
    it("gives a use to the parameter that hides an outer variable", () => {
      const source = sourceOf("const total = 1", "function checkout(total) {", "  return total", "}", "report(total)")

      expect(usesIn(source, "total", 0)).toStrictEqual(["report(«total»)"])
      expect(usesIn(source, "total", 1)).toStrictEqual(["return «total»"])
    })

    it("gives a use to the variable of the nearest block", () => {
      const source = sourceOf("let rate = 1", "{", "  let rate = 2", "  use(rate)", "  { use(rate) }", "}", "use(rate)")

      expect(usesIn(source, "rate", 0)).toStrictEqual(["use(«rate»)"])
      expect(usesIn(source, "rate", 1)).toStrictEqual(["use(«rate»)", "{ use(«rate») }"])
    })

    it("finds the uses of a var variable everywhere in its function", () => {
      const source = sourceOf("function checkout() {", "  use(total)", "  if (ready) {", "    var total = 1", "  }", "  return total", "}", "use(total)")

      expect(usesIn(source, "total")).toStrictEqual(["use(«total»)", "return «total»"])
    })

    it("keeps the own name of a function expression inside that function", () => {
      const source = sourceOf("const compute = 1", "const priceOf = function compute() {", "  return compute", "}", "use(compute)")

      expect(usesIn(source, "compute", 0)).toStrictEqual(["use(«compute»)"])
      expect(usesIn(source, "compute", 1)).toStrictEqual(["return «compute»"])
    })

    it("keeps a catch parameter inside its catch clause", () => {
      const source = sourceOf("const error = 1", "try {} catch (error) {", "  report(error)", "}", "use(error)")

      expect(usesIn(source, "error", 0)).toStrictEqual(["use(«error»)"])
      expect(usesIn(source, "error", 1)).toStrictEqual(["report(«error»)"])
    })

    it("keeps a loop variable inside its loop", () => {
      const source = sourceOf("const index = 9", "for (let index = 0; index < 3; index++) {", "  use(index)", "}", "use(index)")

      expect(usesIn(source, "index", 0)).toStrictEqual(["use(«index»)"])
      expect(usesIn(source, "index", 1)).toStrictEqual(["for (let index = 0; «index» < 3; «index»++) {", "use(«index»)"])
    })

    it("gives a use to the innermost of three parameters of one name", () => {
      const source = sourceOf("const run = (line) =>", "  (line) =>", "    (line) => line", "use(line)")

      expect(usesIn(source, "line", 0)).toStrictEqual([])
      expect(usesIn(source, "line", 1)).toStrictEqual([])
      expect(usesIn(source, "line", 2)).toStrictEqual(["(line) => «line»"])
    })

    it("gives a use to the type parameter that hides an outer type", () => {
      const source = sourceOf("interface Item {}", "function first<Item>(items: Item[]): Item {}", "let item: Item")

      expect(usesIn(source, "Item", 0)).toStrictEqual(["let item: «Item»"])
      expect(usesIn(source, "Item", 1)).toStrictEqual(["function first<Item>(items: «Item»[]): «Item» {}"])
    })

    it("reads the default of a parameter from the parameters before it", () => {
      const source = sourceOf("const amount = 1", "function tax(amount, factor = amount) {}")

      expect(usesIn(source, "amount", 0)).toStrictEqual([])
      expect(usesIn(source, "amount", 1)).toStrictEqual(["function tax(amount, factor = «amount») {}"])
    })
  })

  describe("values and types", () => {
    it("keeps a value and a type of one name apart, and gives an export of the name to both", () => {
      const source = sourceOf(
        "const Cart = schema()",
        "type Cart = Infer<typeof Cart>",
        "const cart: Cart = Cart.parse(input)",
        "export { Cart }",
      )

      expect(usesIn(source, "Cart", 0)).toStrictEqual([
        "type Cart = Infer<typeof «Cart»>",
        "const cart: Cart = «Cart».parse(input)",
        "export { «Cart» }",
      ])
      expect(usesIn(source, "Cart", 1)).toStrictEqual(["const cart: «Cart» = Cart.parse(input)", "export { «Cart» }"])
    })

    it("finds the uses of a class as a value and as a type", () => {
      const source = sourceOf("class Cart {}", "const cart: Cart = new Cart()", "export { Cart }")

      expect(usesIn(source, "Cart")).toStrictEqual(["const cart: «Cart» = new «Cart»()", "export { «Cart» }"])
    })

    it("finds the uses of an import as a value and as a type", () => {
      const source = sourceOf("import { Cart } from \"./cart\"", "const cart: Cart = new Cart()")

      expect(usesIn(source, "Cart")).toStrictEqual(["const cart: «Cart» = new «Cart»()"])
    })

    it.each([
      ["a value where a type is meant", ["const Cart = 1", "let cart: Cart"]],
      ["a type where a value is meant", ["interface Cart {}", "use(Cart)"]],
    ])("finds no use of %s", (_mismatch, lines) => {
      expect(usesIn(sourceOf(...lines), "Cart")).toStrictEqual([])
    })
  })

  it("traces from a use of a name to every use of its declaration", () => {
    const file = typescriptFileOf(sourceOf("const rate = 2", "apply(rate)", "export { rate }"))
    const uses = file.traceUsage(declarationOf(file, "rate"))

    expect(uses).toHaveLength(2)
    expect(file.traceUsage({ name: "rate", range: uses[1].range })).toStrictEqual(uses)
  })

  it("finds no uses of a name the file does not declare", () => {
    const file = typescriptFileOf("window.open()")

    expect(file.traceUsage({ name: "window", range: { start: { line: 1, column: 0 }, end: { line: 1, column: 6 } } })).toStrictEqual([])
  })

  it("gives each use the encapsulations it sits in", () => {
    const file = typescriptFileOf(
      sourceOf(
        "import { priceOf } from \"./pricing\"",
        "export class Cart {",
        "  total() {",
        "    const sum = () => priceOf(this)",
        "    return sum()",
        "  }",
        "}",
        "priceOf(null)",
      ),
    )

    const uses = file.traceUsage(declarationOf(file, "priceOf"))

    expect(uses.map((usage) => [usage.range.start.line, usage.encapsulation?.name, usage.rootEncapsulation?.name])).toStrictEqual([
      [4, "sum", "Cart"],
      [8, undefined, undefined],
    ])
  })
})
