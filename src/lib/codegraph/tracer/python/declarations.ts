/**
 * The function-like declarations in one Python file.
 *
 * Mirrors `tracer/typescript/declarations.ts`: a caller node is a
 * *declaration* — the function a call sits inside — so the climb needs every
 * function-shaped declaration in a candidate file, with the range of its name
 * (what a symbol is keyed on) and the range of its body (what a call site must
 * fall within). This is the tree-sitter-python half; the generic climb never
 * sees a grammar node.
 *
 * What counts as a declaration here:
 *   - `def f():` — a module-level function definition.
 *   - a class method `def m(self):`, named `Class.m` so two methods called `m`
 *     stay distinct.
 *   - `x = lambda ...` at module level — a binding whose value is a lambda;
 *     `x = 1` is not one.
 * A decorator (`@app.route(...)`) wrapping any of these is unwrapped and does
 * not change the shape.
 */
import type { Node, Tree } from "web-tree-sitter"
import type { Range } from "../../types"

/** One function-like declaration, before a file/symbol is attached to it. */
export type LocalDecl = {
  /** The written name; `Class.method` for a class member. */
  name: string
  /** The range of the name identifier. */
  definedAt: Range
  /** The range of the function itself — params and body — for containment. */
  enclosingRange: Range
}

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

/** A decorated def/class wraps the real definition in `definition`. */
const unwrap = (node: Node): Node =>
  node.type === "decorated_definition" ? (node.childForFieldName("definition") ?? node) : node

export function declarationsIn(tree: Tree): LocalDecl[] {
  const out: LocalDecl[] = []
  for (const child of tree.rootNode.namedChildren) {
    if (child !== null) collect(child, out)
  }
  return out
}

function collect(node: Node, out: LocalDecl[]): void {
  const decl = unwrap(node)
  if (decl.type === "function_definition") {
    const name = decl.childForFieldName("name")
    if (name !== null) out.push({ name: name.text, definedAt: rangeOf(name), enclosingRange: rangeOf(decl) })
    return
  }
  if (decl.type === "class_definition") {
    const className = decl.childForFieldName("name")?.text ?? ""
    const body = decl.childForFieldName("body")
    for (const member of body?.namedChildren ?? []) {
      if (member !== null) member_(className, member, out)
    }
    return
  }
  if (decl.type === "expression_statement") {
    // `name = lambda ...`
    const assign = decl.namedChildren.find((c): c is Node => c !== null && c.type === "assignment")
    if (assign === undefined) return
    const left = assign.childForFieldName("left")
    const right = assign.childForFieldName("right")
    if (left?.type === "identifier" && right?.type === "lambda") {
      out.push({ name: left.text, definedAt: rangeOf(left), enclosingRange: rangeOf(right) })
    }
  }
}

function member_(className: string, member: Node, out: LocalDecl[]): void {
  const named = (name: string): string => (className === "" ? name : `${className}.${name}`)
  const decl = unwrap(member) // methods may be decorated (@staticmethod, @property)
  if (decl.type === "function_definition") {
    const name = decl.childForFieldName("name")
    if (name !== null) out.push({ name: named(name.text), definedAt: rangeOf(name), enclosingRange: rangeOf(decl) })
  }
}
