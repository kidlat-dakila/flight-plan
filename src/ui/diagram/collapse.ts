import type { Diagram } from "../../lib/schemas/diagram/schema"

/**
 * Expand / collapse, for execution steps only.
 *
 * A function's execution steps hang below it as `child` edges; the call/value
 * chain runs across on `call`/`value` edges. Collapsing follows **`child` edges
 * only**, so a collapsed node hides the steps nested under it — a whole function,
 * or a single `if`/loop/`try` arm — and never touches the call chain. "Steps
 * only" is not a special case here; it is what following child edges *is*.
 *
 * Both functions here are pure: an IR and a set of collapsed ids in, a smaller
 * IR (or the set of collapsible ids) out. Nothing renders, so both are tested
 * without a board.
 */

/** The ids that can be collapsed: every node with at least one step below it. */
export function collapsibleIds(diagram: Diagram): Set<string> {
  const out = new Set<string>()
  for (const edge of diagram.edges) if (edge.kind === "child") out.add(edge.source)
  return out
}

/**
 * The diagram with the steps under every collapsed node removed.
 *
 * A collapsed node stays; everything reachable from it through `child` edges is
 * hidden, transitively, so collapsing a function also hides the branch arms
 * inside it. Any edge touching a hidden node goes with it. The collapsed node
 * itself keeps its place in the call chain.
 */
export function visibleDiagram(diagram: Diagram, collapsed: ReadonlySet<string>): Diagram {
  const childrenOf = new Map<string, string[]>()
  for (const edge of diagram.edges) {
    if (edge.kind !== "child") continue
    childrenOf.set(edge.source, [...(childrenOf.get(edge.source) ?? []), edge.target])
  }

  const hidden = new Set<string>()
  const stack: string[] = []
  for (const id of collapsed) stack.push(...(childrenOf.get(id) ?? []))
  while (stack.length > 0) {
    const id = stack.pop() as string
    if (hidden.has(id)) continue
    hidden.add(id)
    stack.push(...(childrenOf.get(id) ?? []))
  }

  if (hidden.size === 0) return diagram
  return {
    ...diagram,
    nodes: diagram.nodes.filter((node) => !hidden.has(node.id)),
    edges: diagram.edges.filter((edge) => !hidden.has(edge.source) && !hidden.has(edge.target)),
  }
}
