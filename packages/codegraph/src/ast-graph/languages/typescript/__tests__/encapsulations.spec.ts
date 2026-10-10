import { SCRIPT_DIALECTS, sourceOf } from "@/ast-graph/languages/__tests__/script-files"

describe.each(SCRIPT_DIALECTS)("%s root encapsulations", (_dialect, { fileOf, outlineIn }) => {
  it("lists the first layer of a file, each with what is nested in it", () => {
    const source = sourceOf(
      "const SOME_CONSTANT = 1",
      "",
      "function someFunction() {",
      "  const someInnerFunction = () => {",
      "  }",
      "}",
      "class SomeClass {",
      "  someClassFunction() {",
      "  }",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual([
      "variable SOME_CONSTANT 1-1",
      "function someFunction 3-6",
      "  function someInnerFunction 4-5",
      "class SomeClass 7-10",
      "  method someClassFunction 8-9",
    ])
  })

  it.each([
    ["a function", "function priceOf() {}", "function priceOf 1-1"],
    ["an async function", "async function priceOf() {}", "function priceOf 1-1"],
    ["a generator function", "function* prices() {}", "function prices 1-1"],
    ["an exported function", "export function priceOf() {}", "function priceOf 1-1"],
    ["a named default function", "export default function priceOf() {}", "function priceOf 1-1"],
    ["a variable holding an arrow function", "const priceOf = () => 1", "function priceOf 1-1"],
    ["a variable holding a function expression", "const priceOf = function () {}", "function priceOf 1-1"],
    ["a variable holding a generator", "const prices = function* () {}", "function prices 1-1"],
    ["a class", "class Cart {}", "class Cart 1-1"],
    ["an abstract class", "abstract class Cart {}", "class Cart 1-1"],
    ["an exported class", "export class Cart {}", "class Cart 1-1"],
    ["a named default class", "export default class Cart {}", "class Cart 1-1"],
    ["a variable holding a class", "const Cart = class {}", "class Cart 1-1"],
    ["a constant", "const LIMIT = 3", "variable LIMIT 1-1"],
    ["an exported constant", "export const LIMIT = 3", "variable LIMIT 1-1"],
    ["a let variable", "let total = 0", "variable total 1-1"],
    ["a var variable", "var total = 0", "variable total 1-1"],
    ["a variable holding the result of a call", "const priceOf = memoize(() => 1)", "variable priceOf 1-1"],
    ["an enum", "enum Status { Open }", "variable Status 1-1"],
    ["an exported constant enum", "export const enum Status { Open }", "variable Status 1-1"],
    ["a namespace", "namespace Shop {}", "variable Shop 1-1"],
    ["an exported namespace", "export namespace Shop {}", "variable Shop 1-1"],
    ["a dotted namespace, under its first name", "namespace Shop.Cart {}", "variable Shop 1-1"],
    ["a module block", "module Shop {}", "variable Shop 1-1"],
    ["a default function without a name", "export default function () {}", "function default 1-1"],
    ["a default arrow function", "export default () => 1", "function default 1-1"],
    ["a default class without a name", "export default class {}", "class default 1-1"],
    ["a default object", "export default { limit: 3 }", "variable default 1-1"],
    ["a default call", "export default memoize(priceOf)", "variable default 1-1"],
  ])("lists %s", (_form, source, listed) => {
    expect(outlineIn(source)).toStrictEqual([listed])
  })

  it.each([
    ["an import", "import { priceOf } from \"./pricing\""],
    ["a required module", "const pricing = require(\"./pricing\")"],
    ["an interface", "interface Cart { total: number }"],
    ["a type alias", "export type Cart = { total: number }"],
    ["a declared function", "declare function priceOf(): number"],
    ["a declared constant", "declare const LIMIT: number"],
    ["an exported declared class", "export declare class Cart {}"],
    ["a declared module", "declare module \"pricing\" { export function priceOf(): number }"],
    ["a default export of a name", "export default priceOf"],
    ["an export of names", "export { priceOf, taxOf as tax }"],
    ["a re-export", "export * from \"./pricing\""],
    ["a call", "register(() => { function handler() {} })"],
    ["a function declared inside a block", "if (enabled) { function priceOf() {} }"],
    ["an empty file", ""],
  ])("lists nothing for %s", (_form, source) => {
    expect(outlineIn(source)).toStrictEqual([])
  })

  it("lists an overloaded function once, as its implementation", () => {
    const source = sourceOf(
      "export function priceOf(item: Item): number",
      "export function priceOf(sku: string): number",
      "export function priceOf(given: Item | string): number {",
      "  return 1",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual(["function priceOf 3-5"])
  })

  it("gives each variable of one statement its own range", () => {
    const source = sourceOf("const LIMIT = 3,", "  priceOf = () => {", "    return 1", "  }")

    expect(outlineIn(source)).toStrictEqual(["variable LIMIT 1-1", "function priceOf 2-4"])
  })

  it("lists every name a destructuring declares", () => {
    const source = sourceOf("export const { total, lines: [first, ...others], tax = 0 } = cart", "const [head, , tail] = items")

    expect(outlineIn(source)).toStrictEqual([
      "variable total 1-1",
      "variable first 1-1",
      "variable others 1-1",
      "variable tax 1-1",
      "variable head 2-2",
      "variable tail 2-2",
    ])
  })

  it("covers the export keyword and the decorators of a declaration", () => {
    const source = sourceOf(
      "@Injectable()",
      "export class Cart {",
      "  @Get(':id')",
      "  @Authorized()",
      "  total() {",
      "    return 1",
      "  }",
      "}",
      "export const LIMIT =",
      "  3",
    )

    expect(outlineIn(source)).toStrictEqual(["class Cart 1-8", "  method total 3-7", "variable LIMIT 9-10"])
  })

  it("nests the members of a class that run code", () => {
    const source = sourceOf(
      "class Cart {",
      "  static LIMIT = 3",
      "  private lines = []",
      "  constructor(private readonly tax: number) {}",
      "  get total() { return 1 }",
      "  set total(value) {}",
      "  static create() {}",
      "  async *each() {}",
      "  add = (line) => {}",
      "  remove = function (line) {}",
      "  Line = class {}",
      "  'quoted name'() {}",
      "  [Symbol.iterator]() {}",
      "  #secret() {}",
      "  abstract price(): number",
      "  size(): number",
      "  size() { return 0 }",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual([
      "class Cart 1-18",
      "  method constructor 4-4",
      "  method total 5-5",
      "  method total 6-6",
      "  method create 7-7",
      "  method each 8-8",
      "  method add 9-9",
      "  method remove 10-10",
      "  class Line 11-11",
      "  method quoted name 12-12",
      "  method [Symbol.iterator] 13-13",
      "  method #secret 14-14",
      "  method size 17-17",
    ])
  })

  it("nests the functions and classes declared inside a function, at every depth", () => {
    const source = sourceOf(
      "export function checkout(cart) {",
      "  function subtotal() {",
      "    const priceOf = (line) => line.price",
      "    return cart.lines.map(priceOf)",
      "  }",
      "  if (cart.coupon) {",
      "    var discount = function () {}",
      "  }",
      "  class Receipt {",
      "    print() {}",
      "  }",
      "  const rate = 2, round = () => {}",
      "  return subtotal()",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual([
      "function checkout 1-14",
      "  function subtotal 2-5",
      "    function priceOf 3-3",
      "  function discount 7-7",
      "  class Receipt 9-11",
      "    method print 10-10",
      "  function round 12-12",
    ])
  })

  it("attaches a named function inside a callback to the nearest named encapsulation", () => {
    const source = sourceOf(
      "export function ReviewPage() {",
      "  useEffect(() => {",
      "    const load = async () => {}",
      "    load()",
      "  }, [])",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual(["function ReviewPage 1-6", "  function load 3-3"])
  })

  it("nests the members of a declared object that run code", () => {
    const source = sourceOf(
      "export const api = {",
      "  limit: 3,",
      "  save() {},",
      "  load: async () => {},",
      "  remove: function () {},",
      "  get size() { return 0 },",
      "  nested: {",
      "    deep: () => {},",
      "  },",
      "  Line: class {},",
      "} satisfies Api",
      "export default {",
      "  methods: { submit() {} },",
      "}",
      "class Store {",
      "  actions = { reset: () => {} }",
      "}",
      "function createCart() {",
      "  return { add() {} }",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual([
      "variable api 1-11",
      "  method save 3-3",
      "  method load 4-4",
      "  method remove 5-5",
      "  method size 6-6",
      "  method deep 8-8",
      "  class Line 10-10",
      "variable default 12-14",
      "  method submit 13-13",
      "class Store 15-17",
      "  method reset 16-16",
      "function createCart 18-20",
      "  method add 19-19",
    ])
  })

  it("leaves out the members of an object that is handed to a call", () => {
    const source = sourceOf(
      "export function ReviewPage() {",
      "  const review = useQuery({",
      "    queryFn: () => fetchReview(),",
      "    select(found) { return found },",
      "    options: { onError: () => {} },",
      "  })",
      "  return new Page({ render: () => review })",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual(["function ReviewPage 1-8"])
  })

  it("nests what a namespace and a static block declare", () => {
    const source = sourceOf(
      "namespace Shop {",
      "  export function open() {}",
      "  export const LIMIT = 3",
      "}",
      "class Cart {",
      "  static {",
      "    const prepare = () => {}",
      "  }",
      "}",
    )

    expect(outlineIn(source)).toStrictEqual(["variable Shop 1-4", "  function open 2-2", "class Cart 5-9", "  function prepare 7-7"])
  })

  it("finds the root and the nearest encapsulation of the lines of a real file", () => {
    const file = fileOf(
      sourceOf(
        "export function Editor({ onSave }) {",
        "  const handleSave = () => {",
        "    onSave()",
        "  }",
        "  return handleSave",
        "}",
        "",
        "register(Editor)",
      ),
    )

    expect(file.findRootEncapsulation([3, 3])?.name).toBe("Editor")
    expect(file.findRootEncapsulation([3, 3])?.range.end.line).toBe(6)
  })
})
