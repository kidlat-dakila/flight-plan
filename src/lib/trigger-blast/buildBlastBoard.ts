/**
 * The blast-radius builder: `src/lib/codegraph` model → the authored `type:"blast"`
 * board `checkBlast` accepts.
 *
 * The blast radius asks "what does this change reach" — every declaration that
 * depends on a changed one, however far out. codegraph already answers that: its
 * inverted tree is rooted at the change and `callers` climb *through the
 * dependents*, which is exactly the reach the blast draws. So this builder does
 * not walk anything — it flattens the caller forest into the board's node + edge
 * arrays.
 *
 * Unlike the diagram builder it does **not** flip the tree. The diagram is a
 * top-down trace, so it inverts codegraph; the blast is reach, drawn inward
 * toward the change, which is the direction codegraph already points. An edge
 * `from` a dependent `to` what it uses is a caller edge read straight off.
 *
 * What it fills, from codegraph alone: `id`, `label`, `path`, `lines`, `hop`
 * (BFS distance from the changed nodes), `changed` (the diff-touched
 * declarations), the call `edges`, and `draft`. Everything an agent authors —
 * `changeType`, `effect`, `contract`, `sublabel`, `tag`, `description` — is left
 * off; `shieldedBy`/`via` are derived downstream by `deriveVerdicts`.
 *
 * Deliberately narrower than the old outward walk: codegraph resolves calls
 * only, so a `value-import` edge, a `re-export`/barrel node, and an `unproven`
 * use have no codegraph equivalent and are not drawn.
 *
 * Depends only on `lib/` — the codegraph types and the shared schema package.
 */
import type {
  Diagram as CodeGraph,
  DiagramNode as CodeGraphNode,
  Range,
} from "../codegraph/types"
import type { BlastSeed } from "../schemas/diagram/blast"

/** A changed line range in a file, the same shape the diagram pipeline uses. */
export type ChangedRange = { from: number; to: number }

/** The authored `type:"blast"` board, ready to hand to `checkBlast`. */
export type BlastBoardInput = {
  type: "blast"
  title?: string
  seed: BlastSeed
  nodes: BlastNodeInput[]
  edges: BlastEdgeInput[]
  notes: string[]
}

/** A blast node in the authored shape. */
export type BlastNodeInput = {
  id: string
  label: string
  path: string
  lines: [number, number]
  hop: number
  /** Set only on a declaration the diff touched. */
  changed?: true
  /** The label is the declaration's own name, not authored prose. */
  draft: true
  /**
   * Set when this node is a value-flow escape rather than a declaration — a
   * boundary the reach could not cross. Feeds blast's existing unproven flow:
   * `blastWork` puts it on the worklist and the agent answers where the reach
   * continues. `reason` carries which boundary it was.
   */
  unproven?: { path: string; line: number; reason: string }
}

/** A blast edge: `from` a dependent, `to` what it uses — pointing inward. */
export type BlastEdgeInput = {
  from: string
  to: string
  kind: "call"
  /** The line in `from`'s file where the use is. */
  at?: number
}

/** The join key a node and its edge endpoints share: `file:line` of the name. */
const keyOf = (node: CodeGraphNode): string => `${node.id.file}:${String(node.id.line)}`

const startLine = (range: Range | undefined): number | undefined => range?.start.line

/** Whether a changed range overlaps a declaration's body. */
function touched(body: Range, ranges: readonly ChangedRange[]): boolean {
  const from = body.start.line
  const to = body.end.line
  return ranges.some((range) => range.from <= to && from <= range.to)
}

/**
 * The codegraph reach model → the authored blast board.
 *
 * @param graph  the merged, inverted codegraph forest (roots are the changes).
 * @param changed  the diff's changed line ranges, per file, to mark `changed`.
 * @param seed  what the walk started from, carried onto the board verbatim.
 * @param title  optional board title.
 */
export function buildBlastBoard(
  graph: CodeGraph,
  changed: Record<string, readonly ChangedRange[]>,
  seed: BlastSeed,
  title?: string,
): BlastBoardInput {
  // One entry per declaration (diamonds in the forest are duplicated objects
  // that share a key), and one edge per use.
  const byKey = new Map<string, CodeGraphNode>()
  const edges = new Map<string, BlastEdgeInput>()
  const seen = new Set<CodeGraphNode>()

  const visit = (node: CodeGraphNode): void => {
    if (seen.has(node)) return
    seen.add(node)
    const key = keyOf(node)
    if (!byKey.has(key)) byKey.set(key, node)

    // A caller depends on this node: it is one step further out. Its `calledAt`
    // is the line where it calls this node.
    for (const caller of node.callers) {
      addEdge(edges, keyOf(caller), key, startLine(caller.calledAt))
      visit(caller)
    }
    // A callee here is another change this node calls (a fork). This node
    // depends on it; the callee's `calledAt` is where this node calls it.
    for (const callee of node.callees ?? []) {
      addEdge(edges, key, keyOf(callee), startLine(callee.calledAt))
      visit(callee)
    }
  }
  for (const root of graph) visit(root)

  // Which declarations the diff touched — the centre of the board, hop 0.
  const isChanged = new Map<string, boolean>()
  for (const [key, node] of byKey) {
    isChanged.set(key, touched(node.code.enclosingRange, changed[node.code.file] ?? []))
  }

  const hops = hopsFrom(edges, isChanged)

  const nodes: BlastNodeInput[] = [...byKey].map(([key, node]) => {
    const base: BlastNodeInput = {
      id: key,
      label: node.code.name,
      path: node.code.file,
      lines: [node.code.enclosingRange.start.line, node.code.enclosingRange.end.line],
      hop: hops.get(key) ?? 0,
      draft: true,
    }
    // A value-flow escape becomes an unproven node — the reach may continue past
    // it and an agent is asked where. It carries no `changed` (it is not a
    // declaration the diff touched).
    if (node.escape !== undefined) {
      return {
        ...base,
        unproven: {
          path: node.code.file,
          line: node.escape.at.start.line,
          reason: node.escape.reason,
        },
      }
    }
    return isChanged.get(key) === true ? { ...base, changed: true } : base
  })

  return { type: "blast", ...(title === undefined ? {} : { title }), seed, nodes, edges: [...edges.values()], notes: [] }
}

/**
 * The board for a change whose files no grammar could read, or that traced
 * nothing.
 *
 * A change reaches at least itself, so the blast always has an answer — here
 * the changed files themselves, each a hop-0 node, with no edges. A file is not
 * normally a node (a node is a declaration), but when nothing parsed there is
 * no declaration to name, and drawing the files is more honest than an empty
 * board that reads as "the tool did not run".
 */
export function emptyBlastBoard(
  files: readonly string[],
  seed: BlastSeed,
  note?: string,
): BlastBoardInput {
  const nodes: BlastNodeInput[] = files.map((file) => ({
    id: file,
    label: file.slice(file.lastIndexOf("/") + 1),
    path: file,
    lines: [1, 1],
    hop: 0,
    changed: true,
    draft: true,
  }))
  return {
    type: "blast",
    seed,
    nodes,
    edges: [],
    notes: note === undefined ? [] : [note],
  }
}

/** Records one inward edge, keeping the first `at` seen for a from→to pair. */
function addEdge(
  edges: Map<string, BlastEdgeInput>,
  from: string,
  to: string,
  at: number | undefined,
): void {
  const key = `${from}->${to}`
  if (edges.has(key)) return
  edges.set(key, { from, to, kind: "call", ...(at === undefined ? {} : { at }) })
}

/**
 * Hops from the nearest changed declaration, the minimum over every path.
 *
 * A changed node is hop 0. Its dependents — the `from` of an edge whose `to` is
 * the node — are one hop further out, and so on. Breadth-first, so the first
 * hop assigned is the smallest.
 */
function hopsFrom(
  edges: ReadonlyMap<string, BlastEdgeInput>,
  changed: ReadonlyMap<string, boolean>,
): Map<string, number> {
  // Dependents of each node: who has an edge pointing *to* it.
  const dependents = new Map<string, string[]>()
  for (const edge of edges.values()) {
    const list = dependents.get(edge.to) ?? []
    list.push(edge.from)
    dependents.set(edge.to, list)
  }

  const hops = new Map<string, number>()
  const queue: string[] = []
  for (const [key, isChanged] of changed) {
    if (isChanged) {
      hops.set(key, 0)
      queue.push(key)
    }
  }
  for (let head = 0; head < queue.length; head += 1) {
    const current = queue[head] as string
    const depth = hops.get(current) ?? 0
    for (const dependent of dependents.get(current) ?? []) {
      if (hops.has(dependent)) continue
      hops.set(dependent, depth + 1)
      queue.push(dependent)
    }
  }
  return hops
}
