import { parseWithGrammar, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { collectFromNode, type NodeReading } from "@/ast-graph/walk-tree"

const SOURCE = [
  "function outer(first) {",
  "  const inner = (second) => first + second",
  "  return inner",
  "}",
  "class Cart { total() { return 1 } }",
].join("\n")

const parse = (source: string): SyntaxTree => parseWithGrammar("typescript", source)

const identifiers = (node: SyntaxNode): NodeReading<string> => ({
  found: node.type === "identifier" ? [node.text] : [],
  shouldDescend: true,
})

describe("collectFromNode from the root of a tree", () => {
  it("visits every node of a tree in the order of the source", () => {
    expect(collectFromNode(parse(SOURCE).rootNode, identifiers)).toStrictEqual([
      "outer",
      "first",
      "inner",
      "second",
      "first",
      "second",
      "inner",
    ])
  })

  it("skips what is below a node the reader does not descend into", () => {
    const declarations = (node: SyntaxNode): NodeReading<string> => ({
      found: node.type === "function_declaration" || node.type === "class_declaration" ? [node.type] : [],
      shouldDescend: node.type === "program",
    })

    expect(collectFromNode(parse(SOURCE).rootNode, declarations)).toStrictEqual(["function_declaration", "class_declaration"])
  })

  it("collects several findings from one node", () => {
    const twice = (node: SyntaxNode): NodeReading<string> => ({
      found: node.type === "identifier" ? [node.text, node.text.toUpperCase()] : [],
      shouldDescend: true,
    })

    expect(collectFromNode(parse("const total = 1").rootNode, twice)).toStrictEqual(["total", "TOTAL"])
  })

  it("collects nothing from an empty file", () => {
    expect(collectFromNode(parse("").rootNode, identifiers)).toStrictEqual([])
  })

  it("walks a list of many siblings", () => {
    const elementCount = 20_000
    const source = `const numbers = [${Array.from({ length: elementCount }, (_unused, index) => String(index)).join(", ")}]`
    const numbers = (node: SyntaxNode): NodeReading<string> => ({ found: node.type === "number" ? [node.text] : [], shouldDescend: true })

    expect(collectFromNode(parse(source).rootNode, numbers)).toHaveLength(elementCount)
  })

  it("walks an expression nested deeper than the call stack allows", () => {
    const depth = 100_000
    const source = `const total = ${Array.from({ length: depth }, () => "1").join(" + ")}`
    const numbers = (node: SyntaxNode): NodeReading<string> => ({ found: node.type === "number" ? [node.text] : [], shouldDescend: true })

    expect(collectFromNode(parse(source).rootNode, numbers)).toHaveLength(depth)
  })
})

describe("collectFromNode", () => {
  it("stops at the node it is given and does not move on to its siblings", () => {
    const tree = parse(SOURCE)
    const outer = tree.rootNode.namedChildren[0]

    expect(collectFromNode(outer, identifiers)).not.toContain("Cart")
    expect(collectFromNode(outer, (node) => ({ found: node.type === "class_declaration" ? [node.type] : [], shouldDescend: true }))).toStrictEqual([])
  })

  it("visits only the node it is given and what is below it", () => {
    const tree = parse(SOURCE)
    const cart = tree.rootNode.namedChildren[1]

    expect(collectFromNode(cart, (node) => ({ found: node.type === "property_identifier" ? [node.text] : [], shouldDescend: true }))).toStrictEqual(["total"])
  })
})
