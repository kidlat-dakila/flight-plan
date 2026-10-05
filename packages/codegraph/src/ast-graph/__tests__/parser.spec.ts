import { parseWithGrammar, queryCaptures, type GrammarId } from "@/ast-graph/parser"

const IMPORT_SOURCES = "(import_statement source: (string) @source)"

const sourcesIn = (grammar: GrammarId, text: string): string[] =>
  queryCaptures(grammar, parseWithGrammar(grammar, text).rootNode, IMPORT_SOURCES).map((capture) => capture.node.text)

describe("parseWithGrammar", () => {
  it.each([
    ["typescript", "let a = <Order>b", "type_assertion"],
    ["tsx", "let a = <Order />", "jsx_self_closing_element"],
    ["python", "def total():\n    return 1\n", "function_definition"],
  ] as const)("parses text with the %s grammar", (grammar, text, nodeType) => {
    const tree = parseWithGrammar(grammar, text)

    expect(tree.rootNode.hasError).toBe(false)
    expect(tree.rootNode.toString()).toContain(nodeType)
  })

  it("parses text that does not compile, and marks where it is broken", () => {
    expect(parseWithGrammar("typescript", "const total = = 1").rootNode.hasError).toBe(true)
  })

  it("parses a file longer than the parser's default buffer", () => {
    const statementCount = 20_000
    const tree = parseWithGrammar("typescript", "const price = \"12 €\"\n".repeat(statementCount))

    expect(tree.rootNode.hasError).toBe(false)
    expect(tree.rootNode.namedChildCount).toBe(statementCount)
  })

  it("parses one text after another with the same grammar, and with another in between", () => {
    const first = parseWithGrammar("typescript", "const first = 1")
    const between = parseWithGrammar("python", "between = 2")
    const second = parseWithGrammar("typescript", "const second = 3")

    expect([first, between, second].map((tree) => tree.rootNode.text)).toStrictEqual(["const first = 1", "between = 2", "const second = 3"])
  })
})

describe("queryCaptures", () => {
  it("gives the nodes a query captures, in the order of the source", () => {
    expect(sourcesIn("typescript", "import a from \"./a\"\nimport b from './b'")).toStrictEqual(["\"./a\"", "'./b'"])
    expect(sourcesIn("tsx", "import a from \"./a\"\nexport const b = <a />")).toStrictEqual(["\"./a\""])
  })

  it("captures below the node it is given only", () => {
    const tree = parseWithGrammar("typescript", "import a from \"./a\"\nconst b = 1")

    expect(queryCaptures("typescript", tree.rootNode.namedChildren[1], IMPORT_SOURCES)).toStrictEqual([])
  })

  it("applies the text predicates of a query", () => {
    const tree = parseWithGrammar("typescript", "load(\"./a\")\nrequire(\"./b\")")
    const requireCalls = "(call_expression function: (identifier) @callee arguments: (arguments (string) @path) (#eq? @callee \"require\"))"

    expect(queryCaptures("typescript", tree.rootNode, requireCalls).filter((capture) => capture.name === "path").map((capture) => capture.node.text)).toStrictEqual(["\"./b\""])
  })

  it("throws for a query the grammar cannot compile", () => {
    expect(() => queryCaptures("typescript", parseWithGrammar("typescript", "").rootNode, "(no_such_node) @none")).toThrow("TSQueryErrorNodeType")
  })
})
