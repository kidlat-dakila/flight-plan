import { SCRIPT_DIALECTS, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

describe.each(SCRIPT_DIALECTS)("%s file variables", (_dialect, { scopeIn, variablesIn }) => {
  it.each([
    ["a function", "function priceOf() {}", ["priceOf: inline-declaration function value"]],
    ["a generator function", "function* prices() {}", ["prices: inline-declaration function value"]],
    ["a declared function", "declare function priceOf(): number", ["priceOf: inline-declaration function value"]],
    ["a variable holding an arrow function", "const priceOf = () => 1", ["priceOf: inline-declaration function value"]],
    ["a variable holding a function expression", "let priceOf = function () {}", ["priceOf: inline-declaration function value"]],
    ["a variable holding a class", "const Cart = class {}", ["Cart: inline-declaration class value"]],
    ["a class", "class Cart {}", ["Cart: inline-declaration class value+type"]],
    ["an abstract class", "export abstract class Cart {}", ["Cart: inline-declaration class value+type"]],
    ["a constant", "export const LIMIT = 3", ["LIMIT: inline-declaration primitive value"]],
    ["a var variable without a value", "var total", ["total: inline-declaration primitive value"]],
    ["a declared constant", "declare const LIMIT: number", ["LIMIT: inline-declaration primitive value"]],
    ["a variable holding the result of a call", "const priceOf = memoize(() => 1)", ["priceOf: inline-declaration primitive value"]],
    ["an interface", "interface Cart {}", ["Cart: inline-declaration type type"]],
    ["a type alias", "export type Cart = {}", ["Cart: inline-declaration type type"]],
    ["an enum", "enum Status { Open, Closed }", ["Status: inline-declaration primitive value+type"]],
    ["a namespace", "namespace Shop {}", ["Shop: inline-declaration primitive value+type"]],
    ["a dotted namespace, as its first name", "namespace Shop.Cart {}", ["Shop: inline-declaration primitive value+type"]],
    ["a module block", "module Shop {}", ["Shop: inline-declaration primitive value+type"]],
    ["an alias of a namespace member", "import pricing = Shop.pricing", ["pricing: inline-declaration primitive value+type"]],
    [
      "the own name of a function expression",
      "const priceOf = function compute() {}",
      ["priceOf: inline-declaration function value", "compute: inline-declaration function value"],
    ],
    [
      "the own name of a class expression",
      "const Cart = class Basket {}",
      ["Cart: inline-declaration class value", "Basket: inline-declaration class value+type"],
    ],
    ["several variables of one statement", "let total = 0, priceOf = () => 1", ["total: inline-declaration primitive value", "priceOf: inline-declaration function value"]],
    [
      "every name of a destructuring",
      "const { total, lines: [first, ...others], tax = 0, ...rest } = cart",
      [
        "total: inline-declaration primitive value",
        "first: inline-declaration primitive value",
        "others: inline-declaration primitive value",
        "tax: inline-declaration primitive value",
        "rest: inline-declaration primitive value",
      ],
    ],
    ["the parameter of a catch clause", "try {} catch (error) {}", ["error: inline-declaration primitive value"]],
    ["a destructured catch parameter", "try {} catch ({ message }) {}", ["message: inline-declaration primitive value"]],
    ["the variable of a for loop", "for (let index = 0; ;) {}", ["index: inline-declaration primitive value"]],
    [
      "the variables of a for-of loop",
      "for (const [key, value] of entries) {}",
      ["key: inline-declaration primitive value", "value: inline-declaration primitive value"],
    ],
    ["the variable of a for-in loop", "for (var name in names) {}", ["name: inline-declaration primitive value"]],
  ])("lists %s", (_form, source, listed) => {
    expect(variablesIn(source)).toStrictEqual(listed)
  })

  it.each([
    [
      "plain, destructured, defaulted and rest parameters",
      "function priceOf(item, { price, tax: rate = 0 }, [first], quantity = 1, ...rest) {}",
      ["item", "price", "rate", "first", "quantity", "rest"],
    ],
    ["an optional parameter, and not the this parameter", "function priceOf(this: Cart, coupon?: string) {}", ["coupon"]],
    ["the bare parameter of an arrow function", "const priceOf = item => item.price", ["item"]],
    ["the parameters of a method", "class Cart { add(line, quantity) {} }", ["line", "quantity"]],
    ["a parameter property of a constructor", "class Cart { constructor(private readonly tax: number) {} }", ["tax"]],
    ["the parameters of a function type", "type PriceOf = (item: Item) => number", ["item"]],
    ["the parameters of a callback", "lines.map((line, index) => line)", ["line", "index"]],
  ])("lists %s as arguments", (_form, source, names) => {
    const listed = variablesIn(source).filter((variable) => variable.includes("argument"))

    expect(listed).toStrictEqual(names.map((name) => `${name}: argument primitive value`))
  })

  it.each([
    ["a function", "function first<Item>(items) {}"],
    ["an arrow function", "const first = <Item,>(items) => items"],
    ["a method", "class Cart { first<Item>() {} }"],
    ["a class", "class Box<Item> {}"],
    ["an interface", "interface Box<Item> {}"],
    ["a type alias", "type Box<Item> = Item[]"],
  ])("lists the type parameter of %s as a type argument", (_owner, source) => {
    expect(variablesIn(source)).toContain("Item: argument type type")
  })

  it("lists the types a type expression declares", () => {
    const source = sourceOf(
      "type Element<List> = List extends Array<infer Item> ? Item : never",
      "type Flags<Shape> = { [Key in keyof Shape]: boolean }",
      "interface Prices { [sku: string]: number }",
    )

    expect(variablesIn(source)).toStrictEqual([
      "Element: inline-declaration type type",
      "List: argument type type",
      "Item: inline-declaration type type",
      "Flags: inline-declaration type type",
      "Shape: argument type type",
      "Key: inline-declaration type type",
      "Prices: inline-declaration type type",
      "sku: argument primitive value",
    ])
  })

  it.each([
    ["a function without a name", "export default function () {}", "default: anonymous function value"],
    ["an arrow function", "export default () => 1", "default: anonymous function value"],
    ["a class without a name", "export default class {}", "default: anonymous class value"],
    ["an object", "export default { limit: 3 }", "default: anonymous primitive value"],
    ["a call", "export default memoize(priceOf)", "default: anonymous primitive value"],
  ])("lists a default export of %s as an anonymous variable", (_form, source, listed) => {
    expect(variablesIn(source)).toStrictEqual([listed])
  })

  it.each([
    ["a default export of a name", "export default priceOf"],
    ["an import", "import pricing, { priceOf as price } from \"./pricing\""],
    ["a required module", "const { priceOf } = require(\"./pricing\")"],
    ["a loop over a variable declared elsewhere", "for (name in names) {}"],
    ["a catch clause without a parameter", "try {} catch {}"],
    ["a label", "outer: for (;;) { break outer }"],
    ["an assignment", "total = 1"],
  ])("lists nothing for %s", (_form, source) => {
    expect(variablesIn(source)).toStrictEqual([])
  })

  it.each([
    ["the members of a class", "class Cart { total = 0; add() {}; static LIMIT = 3 }", ["Cart: inline-declaration class value+type"]],
    ["the keys of an object", "const cart = { total: 1, add() {} }", ["cart: inline-declaration primitive value"]],
    ["the members of an enum", "enum Status { Open, Closed }", ["Status: inline-declaration primitive value+type"]],
    ["the members of an interface", "interface Cart { total: number; add(): void }", ["Cart: inline-declaration type type"]],
    ["the labels of a tuple", "type Pair = [first: string, second?: number, ...rest: string[]]", ["Pair: inline-declaration type type"]],
  ])("leaves out %s", (_form, source, listed) => {
    expect(variablesIn(source)).toStrictEqual(listed)
  })

  it("lists an overloaded function once", () => {
    const source = sourceOf(
      "export function priceOf(item: Item): number",
      "// by stock keeping unit",
      "export function priceOf(sku: string): number",
      "export function priceOf(given) {}",
      "declare function taxOf(item: Item): number",
      "declare function taxOf(sku: string): number",
    )

    expect(variablesIn(source).filter((variable) => variable.includes("function"))).toStrictEqual([
      "priceOf: inline-declaration function value",
      "taxOf: inline-declaration function value",
    ])
  })

  describe("scope", () => {
    it.each([
      ["a let variable to its block", ["function checkout() {", "  if (ready) {", "    let total = 0", "  }", "}"], "total", "2-4"],
      ["a var variable to its function", ["function checkout() {", "  if (ready) {", "    var total = 0", "  }", "}"], "total", "1-5"],
      ["a var variable outside every function to the file", ["if (ready) {", "  var total = 0", "}", "later()"], "total", "1-4"],
      ["a var variable in a namespace to the namespace", ["namespace Shop {", "  { var total = 0 }", "}", "later()"], "total", "1-3"],
      ["a var variable in a static block to the block", ["class Cart {", "  static {", "    var total = 0", "  }", "}"], "total", "2-4"],
      ["a function declared in a block to that block", ["if (ready) {", "  function priceOf() {}", "}", "later()"], "priceOf", "1-3"],
      ["a class declared in a function to the body of that function", ["function shop() {", "  class Cart {}", "}", "later()"], "Cart", "1-3"],
      ["a root declaration to the file", ["const LIMIT = 3", "later()"], "LIMIT", "1-2"],
      ["a parameter to its function", ["const LIMIT = 3", "function priceOf(item) {", "  return item", "}"], "item", "2-4"],
      ["a destructured parameter to its function", ["const LIMIT = 3", "function priceOf({ price }) {", "  return price", "}"], "price", "2-4"],
      ["an arrow parameter to its arrow function", ["const priceOf = (item) =>", "  item.price", "later()"], "item", "1-2"],
      ["a bare arrow parameter to its arrow function", ["lines.map(line =>", "  line.price)", "later()"], "line", "1-2"],
      ["a method parameter to its method", ["class Cart {", "  add(line) {", "  }", "}"], "line", "2-3"],
      ["the own name of a function expression to that function", ["const priceOf = function compute() {", "}", "later()"], "compute", "1-2"],
      ["the own name of a class expression to that class", ["const Cart = class Basket {", "}", "later()"], "Basket", "1-2"],
      ["a type parameter to its function", ["const LIMIT = 3", "function first<Item>(items: Item[]) {", "}"], "Item", "2-3"],
      ["a type parameter to its type alias", ["type Box<Item> =", "  Item[]", "later()"], "Item", "1-2"],
      ["a type parameter to its class", ["class Box<Item> {", "}", "later()"], "Item", "1-2"],
      ["an inferred type to its conditional type", ["type Element<List> =", "  List extends Array<infer Item>", "    ? Item", "    : never", "later()"], "Item", "2-4"],
      ["a catch parameter to its catch clause", ["try {", "  run()", "} catch (error) {", "  report(error)", "}"], "error", "3-5"],
      ["a for variable to its loop", ["for (let index = 0; index < 3; index++) {", "  use(index)", "}", "later()"], "index", "1-3"],
      ["a for-of variable to its loop", ["for (const line of lines) {", "  use(line)", "}", "later()"], "line", "1-3"],
      ["a for-of var variable to the file", ["for (var line of lines) {", "  use(line)", "}", "later()"], "line", "1-4"],
      ["a variable of a switch case to the switch body", ["switch (kind) {", "  case 1:", "    let rate = 2", "}", "later()"], "rate", "1-4"],
      ["an anonymous default export to the file", ["later()", "export default () => 1"], "default", "1-2"],
      ["an import to the file", ["import { priceOf } from \"./pricing\"", "later()"], "priceOf", "1-2"],
      ["a module required in a function to the body of that function", ["function load() {", "  const pricing = require(\"./pricing\")", "}", "later()"], "pricing", "1-3"],
    ])("limits %s", (_rule, lines, name, scope) => {
      expect(scopeIn(sourceOf(...lines), name)).toBe(scope)
    })
  })
})
