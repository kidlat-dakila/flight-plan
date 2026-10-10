import { ASTGraphFile, parseVue, readVueSyntax, type Statement } from "@/ast-graph"
import { sourceOf } from "@/ast-graph/languages/__tests__/script-files"

const FIRST_LINE = 1

const fileOf = (...lines: readonly string[]): ASTGraphFile =>
  new ASTGraphFile({
    filePath: "src/Orders.vue",
    diffLines: [],
    syntax: readVueSyntax(parseVue(sourceOf(...lines)), new Map<string, string>()),
  })

const componentStatementsOf = (file: ASTGraphFile): readonly Statement[] => {
  const component = file.findRootEncapsulation([FIRST_LINE, FIRST_LINE])
  return component === null ? [] : file.listStatements(component)
}

const ORDERS = fileOf(
  "<script setup lang=\"ts\">",
  "import OrderList from \"./OrderList.vue\"",
  "const orders = useOrders()",
  "const handleRemove = (id: string) => {",
  "  window.addEventListener(\"keydown\", close)",
  "}",
  "</script>",
  "<template>",
  "  <section>",
  "    <OrderList :orders=\"orders\" @remove.once=\"handleRemove\" />",
  "    <button @click=\"handleRemove(orders[0].id)\">Remove {{ orders.length }}</button>",
  "  </section>",
  "</template>",
)

const WHOLE_FILE = { start: { line: 1, column: 0 }, end: { line: 13, column: 11 } }

const outlineOf = (statements: readonly Statement[], indent = ""): string[] =>
  statements.flatMap(({ type, text, range, statements: nested }) => [
    `${indent}${type} ${String(range.start.line)}-${String(range.end.line)} ${text}`,
    ...outlineOf(nested, `${indent}  `),
  ])

const sitesOf = (file: ASTGraphFile, kind: string): string[] =>
  file
    .listSyntaxSitesIn(WHOLE_FILE)
    .filter((site) => site.kind === kind)
    .map(({ range: { start, end } }) => `${String(start.line)}:${String(start.column)}-${String(end.line)}:${String(end.column)}`)
    .sort()

describe("the syntax sites of a Vue file", () => {
  it("gives an attribute site for every listener and every bound attribute, named as its listener, with the event as it is written", () => {
    const attributes = ORDERS.listSyntaxSitesIn(WHOLE_FILE).flatMap((site) => (site.kind === "attribute" ? [site] : []))

    expect(attributes.map(({ element, attribute, event, isBuiltIn, text }) => [element, attribute, event, isBuiltIn, text])).toStrictEqual([
      ["OrderList", "orders", undefined, false, null],
      ["OrderList", "onRemove", "remove", false, null],
      ["button", "onClick", "click", true, "Remove"],
    ])
    expect(attributes[0].elementName).toStrictEqual({ name: "OrderList", range: { start: { line: 10, column: 5 }, end: { line: 10, column: 14 } } })
  })

  it("gives a markup site for the template and each element, and an element site for the tag of a component", () => {
    expect(sitesOf(ORDERS, "markup")).toStrictEqual(["10:4-10:62", "11:4-11:83", "8:0-13:11", "9:2-12:12"])
    expect(sitesOf(ORDERS, "element")).toStrictEqual(["10:5-10:14"])
  })

  it("gives the sites of the script and of every expression of the template where they stand in the file", () => {
    expect(sitesOf(ORDERS, "callee")).toStrictEqual(["11:20-11:32", "3:15-3:24", "5:2-5:25"])
    expect(sitesOf(ORDERS, "argument")).toStrictEqual(["11:32-11:46", "3:24-3:26", "5:25-5:43"])
    expect(sitesOf(ORDERS, "function")).toStrictEqual(["4:21-6:1"])
  })
})

describe("the statements of a Vue file", () => {
  it("nests the statements of the setup script and the elements of the template in one statement of the component", () => {
    expect(outlineOf(componentStatementsOf(ORDERS))).toStrictEqual([
      "import 2-2 import OrderList from \"./OrderList.vue\"",
      "declaration 3-3 const orders = useOrders()",
      "declaration 4-6 const handleRemove = (id: string) =>",
      "  expression 5-5 window.addEventListener(\"keydown\", close)",
      "return 8-13 <template>",
      "  markup 9-12 <section>",
      "    markup 10-10 <OrderList :orders=\"orders\" @remove.once=\"handleRemove\" />",
      "    markup 11-11 <button @click=\"handleRemove(orders[0].id)\">Remove {{ orders.length }}</button>",
    ])
  })

  it("makes a return of each branch of a v-if chain at the root of the template, named after its directive", () => {
    const branching = fileOf("<template>", "  <p v-if=\"isPending\">Loading</p>", "  <p v-else-if=\"isError\">Failed</p>", "  <ul v-else>", "    <li />", "  </ul>", "</template>")

    expect(outlineOf(componentStatementsOf(branching))).toStrictEqual([
      "return 2-2 v-if=\"isPending\"",
      "  markup 2-2 <p v-if=\"isPending\">Loading</p>",
      "return 3-3 v-else-if=\"isError\"",
      "  markup 3-3 <p v-else-if=\"isError\">Failed</p>",
      "return 4-6 v-else",
      "  markup 4-6 <ul v-else>",
      "    markup 5-5 <li />",
    ])
  })

  it("keeps the statements of a script without setup at the top level of the file", () => {
    const options = fileOf("<script>", "register()", "</script>", "<template>", "  <p />", "</template>")

    expect(outlineOf(options.listTopLevelStatements())).toStrictEqual(["expression 2-2 register()"])
  })
})
