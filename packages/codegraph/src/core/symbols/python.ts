import type { Node, Tree } from "web-tree-sitter"
import type { SymbolSpan } from "./spans"

function span(node: Node): { from: number, to: number } {
  return { from: node.startPosition.row + 1, to: node.endPosition.row + 1 }
}

function nameAt(name: Node): { line: number, column: number } {
  return { line: name.startPosition.row + 1, column: name.startPosition.column + 1 }
}

function named(prefix: string, name: string): string {
  return prefix === "" ? name : `${prefix}.${name}`
}

function assignment(node: Node): { left: Node, right: Node | null } | null {
  if (node.type !== "expression_statement") return null
  const assign = node.namedChildren.find((child) => child.type === "assignment")
  if (assign === undefined) return null
  const left = assign.childForFieldName("left")
  if (left?.type !== "identifier") return null
  return { left, right: assign.childForFieldName("right") }
}

function definitionSpans(outer: Node, inner: Node, prefix: string): SymbolSpan[] {
  const name = inner.childForFieldName("name")
  if (name === null) return []
  const qualified = named(prefix, name.text)
  const isContainer = inner.type === "class_definition"
  const body = inner.childForFieldName("body")
  return [
    { name: qualified, ...span(outer), nameAt: nameAt(name), kind: isContainer ? "container" : "callable" },
    ...(isContainer && body !== null ? walk(body, qualified) : []),
  ]
}

function assignmentSpans(inner: Node, prefix: string): SymbolSpan[] {
  const bound = assignment(inner)
  if (bound === null) return []
  return [
    {
      name: named(prefix, bound.left.text),
      ...span(inner),
      nameAt: nameAt(bound.left),
      kind: bound.right?.type === "lambda" ? "callable" : "other",
    },
  ]
}

function walk(node: Node, prefix: string): SymbolSpan[] {
  return node.namedChildren.flatMap((outer) => {
    const inner = outer.type === "decorated_definition" ? (outer.childForFieldName("definition") ?? outer) : outer
    const isDefinition = inner.type === "function_definition" || inner.type === "class_definition"
    return isDefinition ? definitionSpans(outer, inner, prefix) : assignmentSpans(inner, prefix)
  })
}

export function pythonDeclarationsIn(tree: Tree): SymbolSpan[] {
  return walk(tree.rootNode, "")
}
