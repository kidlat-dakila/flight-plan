/**
 * Merges the per-file diagram trees into one connected diagram.
 *
 * Each changed file produces its own inverted trees, but they overlap and fork:
 * a function changed in one file already appears as a caller in another, and one
 * caller can call two changed functions on different branches. Merging joins
 * everything on the shared declaration ({@link keyOf} the {@link CodeRef}) and
 * emits **one tree per connected group of changes** — an array only across
 * groups that have nothing to do with each other (a different page/action).
 *
 * The rules:
 *   - **One tree per connected component.** Changes linked through the call
 *     graph — in either direction — end up in the same tree, none duplicated.
 *   - **Root = the deepest node of the trace.** Within a component the root is
 *     the change furthest from an entry point (the longest caller chain).
 *   - **Still inverted.** `callers` climbs from the root toward the entry, as
 *     before, so the blast radius and anything else can read the inverted tree.
 *   - **A fork attaches through `callees`.** When the climb reaches a caller
 *     that also calls another change off the main path, that other change is a
 *     *callee* of the shared node and hangs from its `callees` — kept once, not
 *     split into a second root. The rendering layer is where this gets flipped
 *     into a top-down board.
 *   - Every node keeps its own `executionSteps` and `children`.
 */
import { idOf, keyOf } from "./tracer/callerTree"
import type { CodeRef, Diagram, DiagramNode, ExecutionStep, Range } from "./types"

type Info = {
  code: CodeRef
  executionSteps?: ExecutionStep[]
  escape?: DiagramNode["escape"]
  children?: DiagramNode[]
}
/** How one node connects to another: the call site, and whether it is a value handoff. */
type Edge = { at?: Range; via?: DiagramNode["via"] }
/** target key → (other key → the edge between them). */
type Edges = Map<string, Map<string, Edge>>

function link(edges: Edges, from: string, to: string, edge: Edge): void {
  const inner = edges.get(from) ?? new Map<string, Edge>()
  if (!inner.has(to)) inner.set(to, edge)
  edges.set(from, inner)
}

export function mergeDiagrams(diagrams: readonly Diagram[]): Diagram {
  const info = new Map<string, Info>()
  const callersOf: Edges = new Map() // callee → its callers (+ where the caller calls it)
  const calleesOf: Edges = new Map() // caller → what it calls (+ where it calls it)

  const collect = (node: DiagramNode): void => {
    const key = keyOf(node.code)
    // Keep the richest record: the occurrence that carried execution steps and
    // children (its turn as a changed root) fills in what a bare caller
    // occurrence of the same declaration lacks.
    const held = info.get(key) ?? { code: node.code }
    if (held.executionSteps === undefined && node.executionSteps !== undefined) held.executionSteps = node.executionSteps
    if (held.escape === undefined && node.escape !== undefined) held.escape = node.escape
    if (held.children === undefined && node.children !== undefined) held.children = node.children
    info.set(key, held)
    for (const caller of node.callers) {
      const callerKey = keyOf(caller.code)
      // `caller` calls `node`, at `caller.calledAt`; `via` tells a value handoff
      // from a plain call so the board can draw them differently.
      const edge: Edge = { at: caller.calledAt, via: caller.via }
      link(callersOf, key, callerKey, edge)
      link(calleesOf, callerKey, key, edge)
      collect(caller)
    }
  }

  for (const diagram of diagrams) {
    for (const root of diagram) collect(root)
  }

  const keys = [...info.keys()]

  // Undirected neighbours, for splitting into connected components.
  const neighbours = (key: string): string[] => [
    ...(callersOf.get(key)?.keys() ?? []),
    ...(calleesOf.get(key)?.keys() ?? []),
  ]

  // Longest chain of calls ending at a node — its depth from an entry. The
  // deepest node in a component is its root. Memoised; a cycle is cut by `path`.
  const depthMemo = new Map<string, number>()
  const depthOf = (key: string, path: ReadonlySet<string>): number => {
    const cached = depthMemo.get(key)
    if (cached !== undefined) return cached
    if (path.has(key)) return 0
    const next = new Set(path).add(key)
    let best = 0
    for (const caller of callersOf.get(key)?.keys() ?? []) {
      best = Math.max(best, 1 + depthOf(caller, next))
    }
    depthMemo.set(key, best)
    return best
  }

  const placed = new Set<string>()

  // Build one tree from a component root, spanning the component. A neighbour
  // that calls `key` is a caller-child (the inverted spine); a neighbour `key`
  // calls is a callee-child (a fork). `placed` keeps every node to one parent.
  const build = (key: string, edge: Edge | undefined): DiagramNode => {
    placed.add(key)
    const held = info.get(key)
    const code = held?.code ?? EMPTY_REF
    const node: DiagramNode = {
      id: idOf(code),
      code,
      ...(edge?.at ? { calledAt: edge.at } : {}),
      ...(edge?.via ? { via: edge.via } : {}),
      ...(held?.escape ? { escape: held.escape } : {}),
      ...(held?.executionSteps ? { executionSteps: held.executionSteps } : {}),
      ...(held?.children ? { children: held.children } : {}),
      callers: [],
    }
    const callers: DiagramNode[] = []
    for (const [caller, edgeIn] of callersOf.get(key) ?? new Map<string, Edge>()) {
      if (!placed.has(caller)) callers.push(build(caller, edgeIn))
    }
    node.callers = callers
    const callees: DiagramNode[] = []
    for (const [callee, edgeOut] of calleesOf.get(key) ?? new Map<string, Edge>()) {
      if (!placed.has(callee)) callees.push(build(callee, edgeOut))
    }
    if (callees.length > 0) node.callees = callees
    return node
  }

  // One root per connected component: the deepest node reached from any of its
  // members, chosen deterministically on ties.
  const seenComponent = new Set<string>()
  const roots: DiagramNode[] = []
  for (const start of keys) {
    if (seenComponent.has(start)) continue
    // Flood the component.
    const members: string[] = []
    const stack = [start]
    while (stack.length > 0) {
      const key = stack.pop() as string
      if (seenComponent.has(key)) continue
      seenComponent.add(key)
      members.push(key)
      stack.push(...neighbours(key))
    }
    const rootKey = members.reduce((best, key) => {
      const d = depthOf(key, new Set())
      const bd = depthOf(best, new Set())
      return d > bd || (d === bd && key < best) ? key : best
    }, members[0] as string)
    roots.push(build(rootKey, undefined))
  }

  return roots
}

const EMPTY: Range = { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }
const EMPTY_REF: CodeRef = { file: "", name: "", definedAt: EMPTY, enclosingRange: EMPTY }
