/**
 * Where a name is called inside a range.
 *
 * Given a declaration's body range and the local name that stands for the
 * target, find every place that name is *called* — `name(...)` or
 * `receiver.name(...)` — within the range. A bare reference that is not called
 * (`[priceOf]`, `map(priceOf)`) is not a call and is not returned; only a call
 * whose callee is the name counts. A tagged template `` name`…` `` is a call.
 *
 * A JSX element `<Name … />` also counts as a call of `Name`: React invokes the
 * component when it renders the element, so a component is reached through the
 * render tree exactly as a function is reached through a call. This is what lets
 * the caller climb continue up past a component that only ever appears as JSX.
 *
 * The names looked for are module-scope bindings (an import, or the target's
 * own top-level name), so a call counts only when its name means that binding:
 * a parameter or local of the same name shadows it. For `receiver.name()` the
 * receiver is checked the same way; the member name itself cannot be resolved
 * and is matched as written (`this.name()`, `make().name()`).
 *
 * Sites come in pre-order: a call before the calls inside it.
 */
import type { Pos, Range } from "../../types"
import { rangeOf, textOf, type Node, type Parsed } from "./estree"

/** One call of the name. */
export type CallSite = {
  /** The range of the callee name itself. */
  at: Range
  /** The receiver of a member call (`ns.priceOf()` → `"ns"`), else null. */
  receiver: string | null
}

const atOrAfter = (pos: Pos, start: Pos): boolean =>
  pos.line > start.line || (pos.line === start.line && pos.column >= start.column)

const contains = (within: Range, pos: Pos): boolean =>
  atOrAfter(pos, within.start) && atOrAfter(within.end, pos)

/** The callee of a call or a tagged template, or null for any other node. */
export const calleeOf = (node: Node): Node | null =>
  node.type === "CallExpression" ? (node.callee as Node) : node.type === "TaggedTemplateExpression" ? (node.tag as Node) : null

export function callSitesIn(parsed: Parsed, within: Range, name: string): CallSite[] {
  const out: CallSite[] = []
  const scopes = parsed.scopes()
  const meansModuleBinding = (node: Node): boolean => {
    const variable = scopes.moduleVariable(node.name as string)
    return variable !== null && scopes.variableOf(node) === variable
  }
  for (const node of parsed.nodes) {
    const callee = calleeOf(node)
    if (callee !== null) {
      const site = calleeName(parsed, callee)
      if (site !== null && site.name === name && (site.resolved === null || meansModuleBinding(site.resolved))) {
        const at = rangeOf(parsed, site.node)
        if (contains(within, at.start)) out.push({ at, receiver: site.receiver })
      }
    }
    if (node.type === "JSXOpeningElement") {
      const element = node.name as Node
      if (element.type === "JSXIdentifier" && element.name === name && meansModuleBinding(element)) {
        const at = rangeOf(parsed, element)
        if (contains(within, at.start)) out.push({ at, receiver: null })
      }
    }
  }
  return out
}

/**
 * The called name and its receiver: `f()` → `f`; `a.f()` → `f` on `a`, and the
 * name node that must mean a module-scope binding (`f`, `a`), if any.
 */
function calleeName(
  parsed: Parsed,
  callee: Node,
): { name: string; node: Node; receiver: string | null; resolved: Node | null } | null {
  if (callee.type === "Identifier") return { name: callee.name as string, node: callee, receiver: null, resolved: callee }
  if (callee.type === "MemberExpression" && callee.computed !== true) {
    const property = callee.property as Node
    const object = callee.object as Node
    return {
      name: textOf(parsed, property),
      node: property,
      receiver: object.type === "Identifier" ? (object.name as string) : null,
      resolved: object.type === "Identifier" ? object : null,
    }
  }
  return null
}
