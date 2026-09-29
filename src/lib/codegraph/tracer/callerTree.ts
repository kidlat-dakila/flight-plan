/**
 * Who calls a declaration, and every caller chain above it.
 *
 * The generic climb, one level finer than {@link ./importTree}. Given a
 * {@link CallGraph} — a way to ask "which declarations call this one" — this
 * builds the inverted {@link DiagramNode} tree rooted at a changed declaration,
 * its `callers` nesting *upward* to the entry points (declarations nobody
 * calls). It is the reused climb/materialise half of the old SCIP
 * `buildStackTree`, made language-agnostic: everything grammar-specific lives
 * behind the graph, exactly as `traceImporters` keeps it behind `ImportGraph`.
 */
import type { CodeId, CodeRef, DiagramNode, Range } from "../types"

/**
 * The identity of a declaration: its file and the line its name is on.
 *
 * The same declaration recurs as a callee and as a caller; this is what says
 * "the same one", structured rather than a parsed string. `keyOf` is the string
 * form for a `Map`/`Set`; `idOf` is the {@link CodeId} carried on a node.
 */
export const idOf = (ref: CodeRef): CodeId => ({ file: ref.file, line: ref.definedAt.start.line })

export const keyOf = (ref: CodeRef): string => `${ref.file}:${ref.definedAt.start.line}`

/** One declaration that calls another, and where the call is written. */
export type Caller = {
  /** The calling declaration. */
  code: CodeRef
  /** Where, in the caller's own file, the call to the node below it sits. */
  calledAt: Range
}

/** The language-specific seam the climb runs on. */
export type CallGraph = {
  /** The declarations that call one, verified — its callers, each with a site. */
  callersOf: (ref: CodeRef) => Promise<Caller[]>
}

/** Materialise a {@link DiagramNode} from a reference and its call site. */
const nodeFor = (code: CodeRef, calledAt: Range | undefined): DiagramNode => ({
  id: idOf(code),
  code,
  ...(calledAt ? { calledAt } : {}),
  callers: [],
})

/**
 * Climb from a changed declaration to every caller above it.
 *
 * A declaration already on the chain below it is a call cycle: it is
 * materialised once more with no callers, so the climb terminates (the same cut
 * `traceImporters` makes). A declaration reached two ways (a diamond) is climbed
 * once per chain and so appears in each subtree — the tree is a reach, not a
 * deduplicated graph.
 */
export async function traceCallers(graph: CallGraph, root: CodeRef): Promise<DiagramNode> {
  const climb = async (
    code: CodeRef,
    calledAt: Range | undefined,
    seen: ReadonlySet<string>,
  ): Promise<DiagramNode> => {
    const node = nodeFor(code, calledAt)
    const key = keyOf(code)
    if (seen.has(key)) return node // cycle or recursion: stop climbing
    const next = new Set(seen).add(key)
    for (const caller of await graph.callersOf(code)) {
      node.callers.push(await climb(caller.code, caller.calledAt, next))
    }
    return node
  }
  return climb(root, undefined, new Set())
}
