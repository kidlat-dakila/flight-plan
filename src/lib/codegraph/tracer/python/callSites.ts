/**
 * Where a name is called inside a range, in Python.
 *
 * Mirrors `tracer/typescript/callSites.ts`: given a declaration's body range
 * and a local name, find every place that name is *called* — `name(...)` or
 * `receiver.name(...)` — within the range. A bare reference that is not
 * called (`[price_of]`, `register(price_of)`) is not a call and is not
 * returned; only a `call` node whose callee is the name counts. No JSX in
 * Python, so that half of the TS version is dropped.
 */
import type { Node, Tree } from "web-tree-sitter"
import type { Pos, Range } from "../../types"

/** One call of the name. */
export type CallSite = {
  /** The range of the callee name itself. */
  at: Range
  /** The receiver of an attribute call (`ns.price_of()` → `"ns"`), else null. */
  receiver: string | null
}

const rangeOf = (node: Node): Range => ({
  start: { line: node.startPosition.row + 1, column: node.startPosition.column },
  end: { line: node.endPosition.row + 1, column: node.endPosition.column },
})

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)

const contains = (within: Range, pos: Pos): boolean => atOrAfter(pos, within.start) && atOrAfter(within.end, pos)

export function callSitesIn(tree: Tree, within: Range, name: string): CallSite[] {
  const out: CallSite[] = []

  const visit = (node: Node): void => {
    if (node.type === "call") {
      const callee = node.childForFieldName("function")
      if (callee !== null) {
        const site = calleeName(callee)
        if (site !== null && site.name === name) {
          const at = rangeOf(site.node)
          if (contains(within, at.start)) out.push({ at, receiver: site.receiver })
        }
      }
    }
    for (const child of node.namedChildren) {
      if (child !== null) visit(child)
    }
  }
  visit(tree.rootNode)

  return out
}

/**
 * The called name and its receiver: `f()` → `f`, no receiver; `a.f()` → `f`
 * on `"a"`; `a.b.f()` → `f` on `"a.b"` — the receiver is the object's full
 * source text, not just a single identifier, so a multi-segment receiver
 * (a dotted module reference: `pkg.pricing.price_of()`) is still exact
 * rather than degrading to "no receiver".
 */
function calleeName(callee: Node): { name: string; node: Node; receiver: string | null } | null {
  if (callee.type === "identifier") return { name: callee.text, node: callee, receiver: null }
  if (callee.type === "attribute") {
    const property = callee.childForFieldName("attribute")
    if (property === null) return null
    const object = callee.childForFieldName("object")
    return { name: property.text, node: property, receiver: object?.text ?? null }
  }
  return null
}
