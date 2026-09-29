/**
 * The diagram builder: `src/lib/codegraph` model → the renderer's diagram board.
 *
 * This is a thin consumer. It computes no reach of its own — it takes the resolved
 * {@link CodeGraph} the tracer produced and re-shapes it into the authored
 * diagram schema.
 *
 * Two steps, nothing more:
 *   1. **Convert** each codegraph node to a diagram-schema node (id, type,
 *      label, sublabel, changed, sources).
 *   2. **Invert.** codegraph is an *inverted* tree — the changed function is the
 *      root and `callers` nest upward toward the entry points. The diagram is
 *      the other way up: the entry point is the root and `children` are the
 *      nodes that run *after* it, nesting down to the change. So the caller
 *      relationship is flipped — a caller becomes the parent of the node it
 *      calls.
 *
 * Depends only on `lib/` — the codegraph types and the shared schema package —
 * never on `src/api/mcp`'s reach code.
 */
import type {
  Diagram as CodeGraph,
  DiagramNode as CodeGraphNode,
  ExecutionStep,
} from "../codegraph/types"
import type { CodeNodeType } from "../schemas/diagram/schema"

/** A board node in the renderer's authored shape. */
export type BoardNodeInput = {
  id: string
  type: CodeNodeType
  label: string
  sublabel?: string
  /** Set while `label` is still the scaffold's placeholder. See the schema. */
  draft?: true
  changed?: boolean
  /** An escape marker rather than a real declaration (no runnable code). */
  escape?: boolean
  sources?: { path: string; lines?: [number, number] }[]
  /**
   * The functions this one reaches — a `call` edge, or a `value` handoff when
   * `handoff` is set (the function travelled as a value and was fired there).
   */
  edges?: { target: string; handoff?: boolean; variant?: "dashed" }[]
  /** The nodes that run after this one — the steps of its own body (child edges). */
  children?: BoardNodeInput[]
}

/** A step whose text is a type/interface declaration — shape, not code that runs. */
function isTypeDeclaration(text: string): boolean {
  return /^\s*(?:export\s+)?(?:declare\s+)?(?:type|interface)\b/.test(text)
}

/**
 * Turn a function's execution steps into their own board nodes.
 *
 * Each step is a card, chained under its function; a branching step nests its
 * arms as children. Two things are dropped, both by request:
 *   - **unchanged steps** — only steps the diff touched are drawn (a branching
 *     spine is kept when a changed step survives inside it, or its change would
 *     have nowhere to hang);
 *   - **type/interface declarations** — shape, not code that runs.
 */
function stepsToNodes(steps: readonly ExecutionStep[], keyPrefix: string): BoardNodeInput[] {
  const out: BoardNodeInput[] = []
  steps.forEach((step, index) => {
    const id = `${keyPrefix}#${String(index)}`
    const arms = (step.branches ?? []).flatMap((arm, armIndex) =>
      stepsToNodes(arm.steps, `${id}.${String(armIndex)}`),
    )
    const keepSelf = step.changed && !isTypeDeclaration(step.text)
    // Drop a step that is neither a change nor the spine to one.
    if (!keepSelf && arms.length === 0) return
    out.push({
      id,
      type: "logic",
      label: step.text,
      ...(step.changed ? { changed: true } : {}),
      ...(arms.length > 0 ? { children: arms } : {}),
    })
  })
  return out
}

/** The authored `type: "code"` board, ready to hand to `checkDiagram`. */
export type DiagramBoardInput = {
  type: "code"
  title?: string
  nodes: BoardNodeInput[]
}

/** The stable board id for a declaration — its structured join key, stringified. */
function idOf(node: CodeGraphNode): string {
  return `${node.id.file}:${String(node.id.line)}`
}

/** Convert one codegraph node to a diagram-schema node (no tree, just fields). */
function toSchema(node: CodeGraphNode): BoardNodeInput {
  // An escape marker points at no runnable code — it is a boundary, not a
  // declaration — so it carries no `sources` and the code panel stays blank.
  if (node.escape !== undefined) {
    return {
      id: idOf(node),
      type: "logic",
      label: node.code.name,
      sublabel: node.code.name,
      draft: true,
      escape: true,
    }
  }
  const changed = node.executionSteps !== undefined
  return {
    id: idOf(node),
    // codegraph carries no visual category yet, so every node is the default
    // `logic`; refining the chip is a later pass.
    type: "logic",
    /*
     * The identifier goes in `sublabel`, and `label` holds it only as a
     * placeholder.
     *
     * Both fields used to be wrong the other way round — the name in `label`,
     * the path in `sublabel` — which cost an agent a rewrite of every sublabel
     * to a value already in hand, and let a label nobody rewrote ship as raw
     * code. The file is on the card already, through `sources`.
     */
    label: node.code.name,
    sublabel: node.code.name,
    draft: true,
    ...(changed ? { changed: true } : {}),
    sources: [
      {
        path: node.code.file,
        lines: [node.code.enclosingRange.start.line, node.code.enclosingRange.end.line],
      },
    ],
  }
}

/**
 * The reading model, made concrete.
 *
 * Every function is its own board node, laid out **left→right** by the call
 * chain: a caller sits to the left of what it calls (a `call` edge), or to the
 * left of what it *hands off to* (a `value` edge — a hook, a JSX prop, a
 * collection, a return). A function's own execution steps hang **below** it as
 * child nodes (`child` edges). codegraph is inverted — the change is the root
 * and `callers` climb to the entry — so a caller→callee edge is read straight
 * off each `callers`/`callees` link; no tree is flipped, because the two axes
 * are now carried by the two edge kinds rather than by nesting.
 *
 * The board keeps three kinds of node, and only those, because each is one
 * the agent labels and the reader needs:
 *   - a **start**, each change;
 *   - an **end**, each function that uses a start directly — calls it, renders
 *     it, fires it — and each escape marker;
 *   - a **trigger**, the top of each chain above an end: a function nothing
 *     calls, or the first one the board already keeps.
 * Drawn trigger → end → start. What lies between a trigger and its end is left
 * out and the trigger is joined to the end straight, dashed to say hops were
 * skipped; a trigger that calls its end itself keeps its own edge. What a
 * change calls is left out too, unless it also uses a change and so is an end.
 * The whole reach stays on the blast board. (The board's own `children` are
 * the execution steps below a card; they are unrelated to codegraph's.)
 */
export function buildDiagramBoard(graph: CodeGraph, title?: string): DiagramBoardInput {
  const byId = new Map<string, CodeGraphNode>()
  /** source id → the edges leaving it (a call, or a value handoff). */
  const edgesFrom = new Map<string, { target: string; handoff?: boolean }[]>()
  const seenEdge = new Set<string>()

  const addEdge = (from: string, to: string, handoff: boolean): void => {
    const pair = `${from}->${to}`
    if (seenEdge.has(pair)) return
    seenEdge.add(pair)
    edgesFrom.set(from, [...(edgesFrom.get(from) ?? []), { target: to, ...(handoff ? { handoff: true } : {}) }])
  }

  const collect = (node: CodeGraphNode): void => {
    const id = idOf(node)
    // One object per declaration, and the one that carries the steps when one
    // does: a change met first as another's caller is still a change.
    const held = byId.get(id)
    if (held === undefined || (held.executionSteps === undefined && node.executionSteps !== undefined)) byId.set(id, node)
    for (const caller of node.callers) {
      // `caller` calls (or hands off to) `node`: the edge leaves the caller and
      // points right, at what it reaches.
      addEdge(idOf(caller), id, caller.via === "value")
      collect(caller)
    }
    for (const callee of node.callees ?? []) {
      // A fork: `node` reaches `callee`, so the edge leaves `node`.
      addEdge(id, idOf(callee), callee.via === "value")
      collect(callee)
    }
    for (const child of node.children ?? []) {
      // The way down: `node` calls or renders `child`.
      addEdge(id, idOf(child), false)
      collect(child)
    }
  }
  for (const root of graph) collect(root)

  const kept = triggerEndStart(byId, edgesFrom)

  const nodes: BoardNodeInput[] = []
  for (const [id, node] of byId) {
    if (!kept.ids.has(id)) continue
    const schemaNode = toSchema(node)
    const steps = node.executionSteps ? stepsToNodes(node.executionSteps, id) : []
    if (steps.length > 0) schemaNode.children = steps
    const edges = kept.edgesFrom.get(id) ?? []
    if (edges.length > 0) schemaNode.edges = edges
    nodes.push(schemaNode)
  }

  return { type: "code", ...(title !== undefined ? { title } : {}), nodes }
}

type BoardEdge = NonNullable<BoardNodeInput["edges"]>[number]

/**
 * The starts, their ends and the ends' triggers, and the edges between them.
 * See {@link buildDiagramBoard}.
 */
function triggerEndStart(
  byId: ReadonlyMap<string, CodeGraphNode>,
  edgesFrom: ReadonlyMap<string, BoardEdge[]>,
): { ids: Set<string>; edgesFrom: Map<string, BoardEdge[]> } {
  const callersOf = new Map<string, string[]>()
  for (const [from, edges] of edgesFrom) {
    for (const edge of edges) callersOf.set(edge.target, [...(callersOf.get(edge.target) ?? []), from])
  }
  const edgeOf = (from: string, to: string): BoardEdge | undefined => edgesFrom.get(from)?.find((edge) => edge.target === to)

  const starts = new Set([...byId].filter(([, node]) => node.executionSteps !== undefined && node.escape === undefined).map(([id]) => id))
  const out = new Map<string, BoardEdge[]>()
  const add = (from: string, edge: BoardEdge): void => {
    const list = out.get(from) ?? []
    if (!list.some((one) => one.target === edge.target)) out.set(from, [...list, edge])
  }

  // Ends: whatever has an edge into a start, with that edge as it is.
  const ids = new Set(starts)
  for (const start of starts) {
    for (const from of callersOf.get(start) ?? []) {
      ids.add(from)
      add(from, edgeOf(from, start) as BoardEdge)
    }
  }

  // Triggers: climb from each end to the first node already kept, or to one
  // nothing calls. A climb that only loops has no top and draws nothing.
  const ends = [...ids]
  for (const end of ends) {
    const seen = new Set([end])
    const queue = (callersOf.get(end) ?? []).map((from) => ({ from, direct: true }))
    while (queue.length > 0) {
      const { from, direct } = queue.shift() as { from: string; direct: boolean }
      if (seen.has(from)) continue
      seen.add(from)
      const above = callersOf.get(from) ?? []
      const top = ends.includes(from) || above.length === 0
      if (!top) {
        for (const next of above) queue.push({ from: next, direct: false })
        continue
      }
      ids.add(from)
      add(from, direct ? (edgeOf(from, end) as BoardEdge) : { target: end, variant: "dashed" })
    }
  }

  return { ids, edgesFrom: out }
}

/** One node's referenced source, sliced from the files it points at. */
export type NodeSource = { path: string; label: string; from: number; to: number; text: string }

/**
 * The source each board node references, sliced from `files` by its first
 * `sources` range. Pure: a board plus the file contents in, a `nodeId → source`
 * map out. Walks the nested `children` so every node is covered.
 */
export function sourcesForBoard(
  board: DiagramBoardInput,
  files: Record<string, string>,
): Record<string, NodeSource> {
  const out: Record<string, NodeSource> = {}
  const walk = (nodes: readonly BoardNodeInput[]): void => {
    for (const node of nodes) {
      const source = node.sources?.[0]
      if (source?.lines !== undefined) {
        const [from, to] = source.lines
        const lines = (files[source.path] ?? "").split("\n")
        out[node.id] = {
          path: source.path,
          label: `L${String(from)}-${String(to)}`,
          from,
          to,
          text: lines.slice(from - 1, to).join("\n"),
        }
      }
      if (node.children !== undefined) walk(node.children)
    }
  }
  walk(board.nodes)
  return out
}
