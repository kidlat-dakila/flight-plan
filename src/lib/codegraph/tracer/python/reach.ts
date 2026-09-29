/**
 * The whole reach of a changed Python function: forward value-flow, then the climb.
 *
 * The Python analogue of `tracer/typescript/reach.ts`, composed identically:
 *
 *   1. a **forward value-flow pass** ({@link traceValueFlow}) from the changed
 *      declaration — following the function as a *value* through aliases,
 *      decorators, callbacks, collections, returns and framework sinks to every
 *      terminal call site or sink, and marking every point where the value
 *      escapes static resolution;
 *   2. the existing **backward climb** ({@link traceCallers}) resumed from each
 *      invocation site, up through its callers to the entry points.
 *
 * Below an invocation site the edge is a `value` handoff; above it, plain `call`
 * edges. A direct `name()` call is the degenerate case where the forward pass
 * reports the caller itself as the invocation site by a `call` edge.
 *
 * The resolver and the call graph are built once and share a single parse cache
 * (`pythonResolver` behind `pythonCallGraph`), so the forward pass and the
 * caller climb re-parse nothing between them.
 */
import { idOf, keyOf, traceCallers } from "../callerTree"
import type { CallCandidates } from "../language"
import type { CodeRef, DiagramNode, EscapeKind, Range } from "../../types"
import { pythonCallGraph, pythonResolver } from "./callGraph"
import type { PyRepo } from "."
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
  repo: PyRepo,
  candidates: CallCandidates,
  root: CodeRef,
): Promise<DiagramNode> {
  const resolver = pythonResolver(repo)
  const graph = pythonCallGraph(repo, candidates)
  const flow = await traceValueFlow(resolver, candidates, root)

  const rootNode: DiagramNode = { id: idOf(root), code: root, callers: [] }
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

  return rootNode
}
