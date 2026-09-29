import {
  nodesIn,
  tallyOf,
  worklistOf,
  type Work,
  type WorkKind,
} from "../utils/document/worklist"
import type { StoredDocument, StoredWaypoint } from "../../lib/schemas/document/stored"

/**
 * The document, cut down to what a caller asked for.
 *
 * Every projection here answers one question and leaves the rest of the
 * document behind. That is the whole point: the surface this replaces had one
 * read that returned everything, so an agent orienting itself paid for the
 * prose it had just written, twice, at tens of kilobytes a time.
 *
 * **Nothing here is stored.** A projection is computed on the way out, the
 * same way marks are, so there is one representation of the document and no
 * second copy to drift from it.
 */

/** A card or node with its prose left out, which is what orientation needs. */
export type Stub = {
  id: string
  kind: "waypoint" | "node"
  title?: string
  label?: string
  draft?: true
  path?: string
  lines?: { from: number; to: number }
  covers?: number[]
  /** Children exist but were not walked, so a caller knows to ask. */
  childCount: number
}

export type Overview = {
  title: string
  head: string
  base?: string
  status: string
  files: { path: string; scaffolded?: boolean; waypoints: Stub[] }[]
  diagram: { absent: string } | { roots: Stub[] }
  unfilled: { total: number; by: Record<WorkKind, number> }
}

type LooseNode = {
  id?: unknown
  label?: unknown
  draft?: unknown
  sources?: unknown
  children?: unknown
}

function stubOfWaypoint(point: StoredWaypoint): Stub {
  const code = point.code
  const focus = code !== null && code.kind === "ref" ? code.focus : undefined
  return {
    id: point.id,
    kind: "waypoint",
    title: point.title,
    ...(point.draft === true ? { draft: true as const } : {}),
    ...(code === null ? {} : { path: code.path }),
    ...(focus === undefined ? {} : { lines: focus }),
    ...(code !== null && code.kind === "ref" && code.covers !== undefined
      ? { covers: code.covers }
      : {}),
    childCount: point.children?.length ?? 0,
  }
}

function stubOfNode(raw: unknown): Stub | null {
  if (typeof raw !== "object" || raw === null) return null
  const node = raw as LooseNode
  if (typeof node.id !== "string") return null
  const first = Array.isArray(node.sources)
    ? (node.sources[0] as { path?: unknown; lines?: unknown } | undefined)
    : undefined
  return {
    id: node.id,
    kind: "node",
    ...(typeof node.label === "string" ? { label: node.label } : {}),
    ...(node.draft === true ? { draft: true as const } : {}),
    ...(typeof first?.path === "string" ? { path: first.path } : {}),
    ...(first?.lines !== undefined
      ? { lines: first.lines as { from: number; to: number } }
      : {}),
    childCount: Array.isArray(node.children) ? node.children.length : 0,
  }
}

/**
 * Waypoints to a given depth, with what is below them counted rather than walked.
 *
 * Depth 1 — the default — is the file's top-level cards and nothing under
 * them, which is the shape an agent needs to know what it is looking at. A
 * card with children says how many, so asking for more is a decision rather
 * than a guess.
 */
function stubsOfWaypoints(points: readonly StoredWaypoint[], depth: number): Stub[] {
  if (depth <= 0) return []
  return points.flatMap((point) => {
    const stub = stubOfWaypoint(point)
    const kids =
      depth > 1 && point.children !== undefined
        ? stubsOfWaypoints(point.children, depth - 1)
        : []
    return [stub, ...kids]
  })
}

function stubsOfNodes(raw: unknown, depth: number): Stub[] {
  if (depth <= 0 || !Array.isArray(raw)) return []
  return raw.flatMap((one) => {
    const stub = stubOfNode(one)
    if (stub === null) return []
    const kids =
      depth > 1 ? stubsOfNodes((one as LooseNode).children, depth - 1) : []
    return [stub, ...kids]
  })
}

/** The skeleton: ids, titles, sources and what is left, with no prose at all. */
export function overviewOf(doc: StoredDocument, depth = 1): Overview {
  const work = worklistOf(doc, doc.meta.kind)
  const map = doc.diagram as
    | ({ absent?: unknown; nodes?: unknown } | null)
    | undefined

  const diagram: Overview["diagram"] =
    map !== null && map !== undefined && typeof map.absent === "string"
      ? { absent: map.absent }
      : { roots: stubsOfNodes(map?.nodes, depth) }

  return {
    title: doc.title,
    head: doc.meta.kind === "walkthrough" ? doc.meta.head : "",
    ...(doc.meta.kind === "walkthrough" && doc.meta.base !== undefined
      ? { base: doc.meta.base }
      : {}),
    status: doc.meta.status,
    files: doc.codeWalkthrough.files.map((file) => ({
      path: file.path,
      ...(file.scaffolded === true ? { scaffolded: true } : {}),
      waypoints: stubsOfWaypoints(file.waypoints, depth),
    })),
    diagram,
    unfilled: { total: work.length, by: tallyOf(work) },
  }
}

/**
 * The chain from a root down to one id, with every unrelated sibling dropped.
 *
 * What a reader of a single card actually needs is not the board and not the
 * card alone: it is how this step is reached. So the ancestors come back
 * nested in order, and nothing that merely sits beside them does.
 */
export function lineageOfWaypoint(
  doc: StoredDocument,
  id: string,
): { path: string; chain: Stub[] } | null {
  for (const file of doc.codeWalkthrough.files) {
    const found = descend(file.waypoints, id)
    if (found !== null) return { path: file.path, chain: found.map(stubOfWaypoint) }
  }
  return null
}

function descend(
  points: readonly StoredWaypoint[],
  id: string,
): StoredWaypoint[] | null {
  for (const point of points) {
    if (point.id === id) return [point]
    if (point.children === undefined) continue
    const below = descend(point.children, id)
    if (below !== null) return [point, ...below]
  }
  return null
}

export function lineageOfNode(doc: StoredDocument, id: string): Stub[] | null {
  const map = doc.diagram as { nodes?: unknown } | null | undefined
  const chain = descendNodes(map?.nodes, id)
  if (chain === null) return null
  return chain.flatMap((one) => {
    const stub = stubOfNode(one)
    return stub === null ? [] : [stub]
  })
}

function descendNodes(raw: unknown, id: string): unknown[] | null {
  if (!Array.isArray(raw)) return null
  for (const one of raw) {
    if (typeof one !== "object" || one === null) continue
    const node = one as LooseNode
    if (node.id === id) return [one]
    const below = descendNodes(node.children, id)
    if (below !== null) return [one, ...below]
  }
  return null
}

/** Every waypoint in the tour, however deep, with the file it sits under. */
export function* waypointsIn(
  doc: StoredDocument,
): Generator<{ file: string; point: StoredWaypoint }> {
  for (const file of doc.codeWalkthrough.files) {
    yield* walkPoints(file.path, file.waypoints)
  }
}

function* walkPoints(
  file: string,
  points: readonly StoredWaypoint[],
): Generator<{ file: string; point: StoredWaypoint }> {
  for (const point of points) {
    yield { file, point }
    if (point.children !== undefined) yield* walkPoints(file, point.children)
  }
}

/** One raw diagram node by id, for a caller that wants more than a stub. */
export function nodeById(doc: StoredDocument, id: string): unknown | null {
  const chain = descendNodes((doc.diagram as { nodes?: unknown } | null)?.nodes, id)
  return chain === null ? null : (chain[chain.length - 1] ?? null)
}

/** One unresolved call by id, with whatever the resolver narrowed it to. */
export function unresolvedById(doc: StoredDocument, id: string): unknown | null {
  const open = (doc.diagram as { unresolved?: unknown } | null)?.unresolved
  if (!Array.isArray(open)) return null
  return (
    open.find(
      (one) =>
        typeof one === "object" && one !== null && (one as { id?: unknown }).id === id,
    ) ?? null
  )
}

/** Which node ids name a given path, for annotating a diff with the board. */
export function idsForPath(doc: StoredDocument, path: string): string[] {
  const found = new Set<string>()
  for (const { point } of waypointsIn(doc)) {
    if (point.code !== null && point.code.path === path) found.add(point.id)
  }
  for (const node of nodesIn(doc.diagram)) {
    const raw = nodeById(doc, node.id) as { sources?: unknown } | null
    const sources = Array.isArray(raw?.sources) ? raw.sources : []
    for (const one of sources) {
      const source = one as { path?: unknown }
      if (source.path === path) found.add(node.id)
    }
  }
  return [...found]
}

/** The worklist, re-exported so callers take it from one place. */
export function unfilledOf(doc: StoredDocument): Work[] {
  return worklistOf(doc, doc.meta.kind)
}
