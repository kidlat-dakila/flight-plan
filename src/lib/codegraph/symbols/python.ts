import type { Node, Tree } from "web-tree-sitter"
import type { SymbolSpan } from "./spans"

/**
 * What one Python file declares, in the same `SymbolSpan` shape as the
 * TypeScript rules in `declarations.ts`, so the scaffold and `{ symbol }`
 * resolution read a Python file the way they read a TypeScript one.
 *
 * The same descent rule: through containers, never into bodies. A class is a
 * `container` and its body is walked; a function or method is `callable` and
 * its body is not, so a local assignment inside a function is never mistaken
 * for the thing a change was about. A module or class-level assignment is
 * `other`, or `callable` when its value is a lambda.
 *
 * A decorator belongs to what it decorates, so a decorated definition's span
 * starts on its first decorator; its name is still the definition's.
 */

function span(node: Node): { from: number; to: number } {
  return { from: node.startPosition.row + 1, to: node.endPosition.row + 1 }
}

function nameAt(name: Node): { line: number; column: number } {
  return { line: name.startPosition.row + 1, column: name.startPosition.column + 1 }
}

function named(prefix: string, name: string): string {
  return prefix === "" ? name : `${prefix}.${name}`
}

/** `NAME = value` (or `NAME: T = value`) as one statement, else null. */
function assignment(node: Node): { left: Node; right: Node | null } | null {
  if (node.type !== "expression_statement") return null
  const assign = node.namedChildren.find((child): child is Node => child !== null && child.type === "assignment")
  if (assign === undefined) return null
  const left = assign.childForFieldName("left")
  if (left?.type !== "identifier") return null
  return { left, right: assign.childForFieldName("right") }
}

function walk(node: Node, prefix: string, into: SymbolSpan[]): void {
  for (const outer of node.namedChildren) {
    if (outer === null) continue
    // The definition inside a decorated one; the span stays the outer node's.
    const inner = outer.type === "decorated_definition" ? (outer.childForFieldName("definition") ?? outer) : outer

    if (inner.type === "function_definition" || inner.type === "class_definition") {
      const name = inner.childForFieldName("name")
      if (name === null) continue
      const qualified = named(prefix, name.text)
      const container = inner.type === "class_definition"
      into.push({ name: qualified, ...span(outer), nameAt: nameAt(name), kind: container ? "container" : "callable" })
      const body = inner.childForFieldName("body")
      if (container && body !== null) walk(body, qualified, into)
      continue
    }

    const bound = assignment(inner)
    if (bound === null) continue
    into.push({
      name: named(prefix, bound.left.text),
      ...span(inner),
      nameAt: nameAt(bound.left),
      kind: bound.right?.type === "lambda" ? "callable" : "other",
    })
  }
}

export function pythonDeclarationsIn(tree: Tree): SymbolSpan[] {
  const out: SymbolSpan[] = []
  walk(tree.rootNode, "", out)
  return out
}
