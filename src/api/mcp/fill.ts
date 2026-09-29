import type { DocumentInput } from "../../lib/schemas/document/schema"
import type { WaypointFinding } from "../../lib/schemas/document/schema"

/**
 * Writing prose into a scaffold, and nothing else.
 *
 * The agent's half. The structure was derived from the diff and the call graph
 * and is not the agent's to change, so nothing here can add, remove or move a
 * node or a waypoint — only fill one in. The wrong thing is unsayable rather
 * than refused: there is no `changed` in an edit's shape, no `children`, no
 * `covers`, so an agent cannot express a structural change to argue about.
 *
 * The one thing the agent *can* do that the scaffold cannot is decide the
 * reading order.
 *
 * **An unknown id is refused, and nothing is applied.** An agent that invented
 * one has lost track of the document, and a partial apply would leave it unable
 * to tell which half of its call landed.
 */

export type WaypointEdit = {
  id: string
  title?: string
  reading?: string
  needsAttention?: string
  findings?: WaypointFinding[]
}

export type NodeEdit = {
  id: string
  label?: string
  sublabel?: string
  description?: string
}

export type Filled = { document: DocumentInput; unknown: string[] }

type Waypoint = DocumentInput["codeWalkthrough"]["files"][number]["waypoints"][number]

/** Applies an edit to the waypoint with each id, at any depth. */
function editWaypoints(
  points: readonly Waypoint[],
  edits: ReadonlyMap<string, WaypointEdit>,
  seen: Set<string>,
): Waypoint[] {
  return points.map((point) => {
    const edit = edits.get(point.id)
    if (edit !== undefined) seen.add(point.id)
    const children =
      point.children === undefined
        ? undefined
        : editWaypoints(point.children, edits, seen)

    if (edit === undefined) {
      return children === undefined ? point : { ...point, children }
    }
    /*
     * Writing a title is what makes it no longer the scaffold's.
     *
     * The mark has to be cleared by the same call that replaces the text, or
     * the check at completion would refuse a title somebody wrote — which is
     * the failure mode that makes a gate get switched off.
     */
    const { draft: _wasDraft, ...rest } = point as typeof point & { draft?: true }
    const stillDraft = edit.title === undefined && point.draft === true

    return {
      ...rest,
      ...(stillDraft ? { draft: true as const } : {}),
      ...(edit.title === undefined ? {} : { title: edit.title }),
      ...(edit.reading === undefined ? {} : { reading: edit.reading }),
      ...(edit.needsAttention === undefined ? {} : { needsAttention: edit.needsAttention }),
      ...(edit.findings === undefined ? {} : { findings: edit.findings }),
      ...(children === undefined ? {} : { children }),
    }
  })
}

export function fillWaypoints(
  document: DocumentInput,
  edits: readonly WaypointEdit[],
): Filled {
  const wanted = new Map(edits.map((edit) => [edit.id, edit]))
  const seen = new Set<string>()

  const files = document.codeWalkthrough.files.map((file) => ({
    ...file,
    waypoints: editWaypoints(file.waypoints, wanted, seen),
  }))

  const missing = edits.map((edit) => edit.id).filter((id) => !seen.has(id))
  if (missing.length > 0) return { document, unknown: missing }

  return {
    document: { ...document, codeWalkthrough: { ...document.codeWalkthrough, files } },
    unknown: [],
  }
}

type LooseNode = { id?: unknown; children?: unknown; draft?: unknown }

function editNodes(
  nodes: readonly unknown[],
  edits: ReadonlyMap<string, NodeEdit>,
  seen: Set<string>,
): unknown[] {
  return nodes.map((raw) => {
    const node = raw as LooseNode
    const id = typeof node.id === "string" ? node.id : ""
    const edit = edits.get(id)
    if (edit !== undefined) seen.add(id)

    const children = Array.isArray(node.children)
      ? editNodes(node.children as unknown[], edits, seen)
      : undefined

    if (edit === undefined) {
      return children === undefined ? raw : { ...node, children }
    }
    const { id: _ignored, ...prose } = edit
    /*
     * A written label is no longer the scaffold's, so the mark comes off.
     *
     * Same rule as a waypoint title one file up: the flag says "nobody has
     * rewritten this", and leaving it after somebody has would keep the node on
     * the worklist for work that is done.
     */
    const { draft: _wasDraft, ...rest } = raw as Record<string, unknown>
    const stillDraft = edit.label === undefined && node.draft === true
    return {
      ...rest,
      ...prose,
      ...(stillDraft ? { draft: true as const } : {}),
      ...(children === undefined ? {} : { children }),
    }
  })
}

function diagramNodes(document: DocumentInput): unknown[] | null {
  const diagram = document.diagram as { nodes?: unknown }
  return Array.isArray(diagram.nodes) ? (diagram.nodes as unknown[]) : null
}

export function fillNodes(document: DocumentInput, edits: readonly NodeEdit[]): Filled {
  const nodes = diagramNodes(document)
  if (nodes === null) return { document, unknown: edits.map((edit) => edit.id) }

  const wanted = new Map(edits.map((edit) => [edit.id, edit]))
  const seen = new Set<string>()
  const next = editNodes(nodes, wanted, seen)

  const missing = edits.map((edit) => edit.id).filter((id) => !seen.has(id))
  if (missing.length > 0) return { document, unknown: missing }

  return {
    document: {
      ...document,
      diagram: { ...(document.diagram as object), nodes: next } as unknown as DocumentInput["diagram"],
    },
    unknown: [],
  }
}

/**
 * The file sections, in the order the agent decided.
 *
 * Every section has to appear exactly once. A reordering that left one out
 * would drop a file off the end of the document, which is the one thing a
 * reordering must never do, so an incomplete order is refused and the message
 * names what was missed.
 */
export function reorderFiles(document: DocumentInput, order: readonly string[]): Filled {
  const files = document.codeWalkthrough.files
  const have = new Set(files.map((file) => file.path))

  const unheardOf = order.filter((path) => !have.has(path))
  if (unheardOf.length > 0) return { document, unknown: unheardOf }

  const named = new Set(order)
  const left = files.map((file) => file.path).filter((path) => !named.has(path))
  if (left.length > 0) return { document, unknown: left }

  const byPath = new Map(files.map((file) => [file.path, file]))
  return {
    document: {
      ...document,
      codeWalkthrough: {
        ...document.codeWalkthrough,
        files: order.map((path) => byPath.get(path) as (typeof files)[number]),
      },
    },
    unknown: [],
  }
}

/** One card's new place among its siblings, counting from 1. */
export type Move = { id: string; position?: number }

/**
 * Cards moved among their siblings, and nothing else moved.
 *
 * The one structural edit the agent is trusted with, and it is trusted because
 * a permutation of a fixed set cannot do the damage the rest of restructuring
 * can: nothing is added, nothing is removed, nothing changes parent, and the
 * schema's "two children or none" cannot be violated by reordering a list. The
 * board still matches the call graph afterwards, which is the property that
 * makes a scaffolded document worth trusting.
 *
 * **Top level of one file only.** A nested id is refused rather than moved,
 * because moving a child between parents is reparenting wearing an order's
 * clothes — and that is the edit the scaffold owns.
 *
 * **Resolved together, against the list as it was.** Applying moves one at a
 * time makes the result depend on the order the caller happened to write them
 * in, which the caller cannot see. So every position is read as a final index,
 * the named cards are placed, and everything unnamed keeps its relative order
 * in the gaps.
 */
export function withPositions(document: DocumentInput, moves: readonly Move[]): DocumentInput {
  const wanted = new Map<string, number>()
  for (const move of moves) {
    if (move.position === undefined) continue
    wanted.set(move.id, move.position)
  }
  if (wanted.size === 0) return document

  const files = document.codeWalkthrough.files
  const placed = new Set<string>()

  const next = files.map((file) => {
    const points = file.waypoints
    const here = points.filter((point) => wanted.has(point.id))
    if (here.length === 0) return file

    const size = points.length
    const slots = new Map<number, (typeof points)[number]>()
    for (const point of here) {
      const at = wanted.get(point.id) as number
      if (at < 1 || at > size) {
        throw new Error(
          `\`${point.id}\` cannot go to position ${String(at)}: \`${file.path}\` has ${String(size)} top-level card${size === 1 ? "" : "s"}. A move off the end is refused rather than clamped, because a clamped move is a move that did not happen.`,
        )
      }
      if (slots.has(at)) {
        throw new Error(
          `Two cards were given position ${String(at)} in \`${file.path}\`. One position holds one card; nothing was moved.`,
        )
      }
      slots.set(at, point)
      placed.add(point.id)
    }

    const rest = points.filter((point) => !wanted.has(point.id))
    const out: (typeof points)[number][] = []
    let spare = 0
    for (let at = 1; at <= size; at += 1) {
      const fixed = slots.get(at)
      if (fixed !== undefined) {
        out.push(fixed)
        continue
      }
      const filler = rest[spare]
      spare += 1
      if (filler !== undefined) out.push(filler)
    }

    return { ...file, waypoints: out }
  })

  const missed = [...wanted.keys()].filter((id) => !placed.has(id))
  if (missed.length > 0) {
    throw new Error(
      `${missed.join(", ")} ${missed.length === 1 ? "is not a top-level card" : "are not top-level cards"} of any file, so ${missed.length === 1 ? "it" : "they"} cannot be reordered. Only a file's own cards take a position; a nested one would be changing its parent, which the scaffold owns.`,
    )
  }

  return { ...document, codeWalkthrough: { ...document.codeWalkthrough, files: next } }
}
