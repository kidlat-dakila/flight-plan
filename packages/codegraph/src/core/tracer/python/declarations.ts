import type { Node, Tree } from "web-tree-sitter"
import type { Range } from "@/core/types"

export interface LocalDecl {
  name: string
  definedAt: Range
  enclosingRange: Range
}

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

const unwrap = (node: Node): Node =>
  node.type === "decorated_definition" ? (node.childForFieldName("definition") ?? node) : node

export function declarationsIn(tree: Tree): LocalDecl[] {
  return tree.rootNode.namedChildren.flatMap(collect)
}

function functionDeclaration(decl: Node, className: string): LocalDecl[] {
  const name = decl.childForFieldName("name")
  if (decl.type !== "function_definition" || name === null) return []
  return [{ name: className === "" ? name.text : `${className}.${name.text}`, definedAt: rangeOf(name), enclosingRange: rangeOf(decl) }]
}

function lambdaDeclaration(decl: Node): LocalDecl[] {
  const assign = decl.namedChildren.find((child) => child.type === "assignment")
  const left = assign?.childForFieldName("left")
  const right = assign?.childForFieldName("right")
  if (left?.type !== "identifier" || right?.type !== "lambda") return []
  return [{ name: left.text, definedAt: rangeOf(left), enclosingRange: rangeOf(right) }]
}

function collect(node: Node): LocalDecl[] {
  const decl = unwrap(node)
  if (decl.type === "function_definition") return functionDeclaration(decl, "")
  if (decl.type === "class_definition") {
    const className = decl.childForFieldName("name")?.text ?? ""
    const members = decl.childForFieldName("body")?.namedChildren ?? []
    return members.flatMap((member) => functionDeclaration(unwrap(member), className))
  }
  return decl.type === "expression_statement" ? lambdaDeclaration(decl) : []
}
