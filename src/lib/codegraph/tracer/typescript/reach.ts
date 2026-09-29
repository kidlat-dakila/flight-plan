/**
 * The whole reach of a changed function: forward value-flow, then the climb.
 *
 * `traceReach` is the entry the diagram builds on. It answers "where is this
 * change ultimately invoked" in two composed halves:
 *
 *   1. a **forward value-flow pass** ({@link traceValueFlow}) from the changed
 *      declaration — following the function as a *value* through aliases, hooks,
 *      JSX props, collections and returns to every terminal call site or sink,
 *      and marking every point where the value escapes static resolution;
 *   2. the existing **backward climb** ({@link traceCallers}) resumed from each
 *      invocation site, up through its callers to the entry points.
 *
 * The root also carries its {@link DiagramNode.children}: what the changed
 * declaration itself calls or renders, the way down ({@link childrenFinder}).
 *
 * Below an invocation site the edge is a `value` handoff; above it, plain `call`
 * edges. A direct `name()` call is the degenerate case where the forward pass
 * reports the caller itself as the invocation site by a `call` edge.
 */
import { idOf, keyOf, traceCallers } from "../callerTree"
import type { CallCandidates } from "../language"
import type { CodeRef, DiagramNode, EscapeKind, Range } from "../../types"
import { holderOf, typescriptCallGraph, typescriptResolver } from "./callGraph"
import { childrenFinder } from "./children"
import type { Repo } from "."
import { traceValueFlow } from "./valueFlow"

/** A leaf node marking where the value escaped static resolution. */
const escapeNode = (reason: EscapeKind, at: Range, file: string): DiagramNode => ({
  id: { file, line: at.start.line },
  code: { file, name: `escapes: ${reason}`, definedAt: at, enclosingRange: at },
  via: "value",
  escape: { reason, at },
  callers: [],
})

export async function traceReach(
  repo: Repo,
  candidates: CallCandidates,
  root: CodeRef,
): Promise<DiagramNode> {
  const resolver = typescriptResolver(repo)
  const graph = typescriptCallGraph(repo, candidates)
  const flow = await traceValueFlow(resolver, candidates, root)

  const children = await childrenFinder(resolver)(root)
  const rootNode: DiagramNode = { id: idOf(root), code: root, callers: [], ...(children.length > 0 ? { children } : {}) }
  const seen = new Set<string>()

  for (const invocation of flow.invocations) {
    const key = `${keyOf(invocation.code)}:${invocation.via}`
    if (seen.has(key)) continue
    seen.add(key)
    // Climb from the invocation site to the entry points, then tag how it
    // connects to the change below it.
    const subtree = await traceCallers(graph, invocation.code)
    subtree.via = invocation.via
    subtree.calledAt = invocation.calledAt
    rootNode.callers.push(subtree)
  }

  for (const esc of flow.escapes) {
    rootNode.callers.push(escapeNode(esc.reason, esc.at, esc.file))
  }

  // A local function used in no way the flow reads still runs only when the
  // function holding it does: climb from there rather than end at nothing.
  if (rootNode.callers.length === 0) {
    const holder = holderOf(root, await resolver.declarationsOf(root.file))
    if (holder !== undefined) {
      const subtree = await traceCallers(graph, holder)
      subtree.via = "value"
      subtree.calledAt = root.definedAt
      rootNode.callers.push(subtree)
    }
  }

  return rootNode
}
