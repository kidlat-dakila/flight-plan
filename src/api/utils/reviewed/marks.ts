import * as crypto from "node:crypto"
import type { StoredDocument, StoredWaypoint } from "../../../lib/schemas/document/stored"

/**
 * Which waypoints and files a reader has marked as reviewed.
 *
 * The reader's state, not the agent's, so it is kept beside the server and
 * never in the document: agents rewrite whole documents, and a mark inside one
 * would be lost on every write. The price is that a mark can outlive what it
 * was about, so each mark stores a hash of the item's content when it was
 * marked. A mark whose hash no longer matches is ignored, and the item shows
 * again.
 *
 * Content is the item as the document stores it: a waypoint is the whole
 * waypoint object with its children, a file is the whole file section. A change
 * to the cited code alone, with the same document, changes neither.
 *
 * The marks are kept minimal. A mark covers everything under it: a waypoint
 * covers its children, a file covers its waypoints. So marking a parent drops
 * the marks under it, and unmarking one child of a marked parent replaces the
 * parent's mark with marks on the siblings that stay reviewed.
 */

/** What is stored: key → content hash. Waypoints by `id`, files by `path`. */
export type ReviewedMarks = {
  version: 1
  waypoints: Record<string, string>
  files: Record<string, string>
}

/** What is reviewed now, with every mark applied and every stale one ignored. */
export type ReviewedState = {
  waypoints: string[]
  files: string[]
}

export type ReviewedTarget = { waypoint: string } | { file: string }

export type ReviewedChange = { op: "mark" | "unmark"; target: ReviewedTarget }

export const NO_MARKS: ReviewedMarks = { version: 1, waypoints: {}, files: {} }

/** JSON with sorted keys, so the hash does not depend on key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, inner]) => inner !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, inner]) => `${JSON.stringify(key)}:${canonical(inner)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

export function contentHash(value: unknown): string {
  return crypto.createHash("sha256").update(canonical(value)).digest("hex")
}

type File = StoredDocument["codeWalkthrough"]["files"][number]

type Located = {
  waypoint: StoredWaypoint
  file: File
  /** From the top-level waypoint down to this one's parent. */
  ancestors: StoredWaypoint[]
}

function locate(document: StoredDocument, id: string): Located | null {
  const walk = (list: readonly StoredWaypoint[], file: File, ancestors: StoredWaypoint[]): Located | null => {
    for (const waypoint of list) {
      if (waypoint.id === id) return { waypoint, file, ancestors }
      const inner = walk(waypoint.children ?? [], file, [...ancestors, waypoint])
      if (inner !== null) return inner
    }
    return null
  }
  for (const file of document.codeWalkthrough.files) {
    const found = walk(file.waypoints, file, [])
    if (found !== null) return found
  }
  return null
}

function fileOf(document: StoredDocument, path: string): File | null {
  return document.codeWalkthrough.files.find((file) => file.path === path) ?? null
}

function descendants(waypoint: StoredWaypoint): StoredWaypoint[] {
  return (waypoint.children ?? []).flatMap((child) => [child, ...descendants(child)])
}

function current(marks: Record<string, string>, key: string, content: unknown): boolean {
  const hash = marks[key]
  return hash !== undefined && hash === contentHash(content)
}

/**
 * The marks that still apply to this document.
 *
 * Stale marks and marks on items the document no longer has are dropped, so
 * the file does not grow with every rewrite.
 */
export function prune(document: StoredDocument, marks: ReviewedMarks): ReviewedMarks {
  const out: ReviewedMarks = { version: 1, waypoints: {}, files: {} }
  for (const [id, hash] of Object.entries(marks.waypoints)) {
    const found = locate(document, id)
    if (found !== null && hash === contentHash(found.waypoint)) out.waypoints[id] = hash
  }
  for (const [path, hash] of Object.entries(marks.files)) {
    const file = fileOf(document, path)
    if (file !== null && hash === contentHash(file)) out.files[path] = hash
  }
  return out
}

/**
 * What is reviewed, in document order.
 *
 * A waypoint is reviewed when it or an ancestor has a current mark, or its
 * file does. A file is reviewed when it has a current mark, or when it has
 * waypoints and every one of them is reviewed — which is every top-level one,
 * since a reviewed waypoint's children are reviewed with it.
 */
export function reviewedState(document: StoredDocument, marks: ReviewedMarks): ReviewedState {
  const waypoints: string[] = []
  const files: string[] = []
  for (const file of document.codeWalkthrough.files) {
    const fileMarked = current(marks.files, file.path, file)
    const visit = (waypoint: StoredWaypoint, covered: boolean): boolean => {
      const reviewed = covered || current(marks.waypoints, waypoint.id, waypoint)
      if (reviewed) waypoints.push(waypoint.id)
      // Every child is visited, so each one's own mark is counted too. A
      // parent whose children are all reviewed is not reviewed itself: its
      // own title and reading are still unread.
      for (const child of waypoint.children ?? []) visit(child, reviewed)
      return reviewed
    }
    const all = file.waypoints.map((waypoint) => visit(waypoint, fileMarked))
    if (fileMarked || (all.length > 0 && all.every(Boolean))) files.push(file.path)
  }
  return { waypoints, files }
}

/** Applies one change. Unknown targets change nothing. */
export function applyChange(
  document: StoredDocument,
  marks: ReviewedMarks,
  change: ReviewedChange,
): ReviewedMarks {
  const next = prune(document, marks)
  const target = change.target

  if ("file" in target) {
    const file = fileOf(document, target.file)
    if (file === null) return next
    // Either way the marks under the file go: a file mark covers them, and a
    // file shown again should show all of it.
    for (const waypoint of file.waypoints.flatMap((top) => [top, ...descendants(top)])) {
      delete next.waypoints[waypoint.id]
    }
    if (change.op === "mark") next.files[file.path] = contentHash(file)
    else delete next.files[file.path]
    return next
  }

  const found = locate(document, target.waypoint)
  if (found === null) return next
  const { waypoint, file, ancestors } = found

  if (change.op === "mark") {
    for (const below of descendants(waypoint)) delete next.waypoints[below.id]
    next.waypoints[waypoint.id] = contentHash(waypoint)
    return next
  }

  delete next.waypoints[waypoint.id]
  for (const below of descendants(waypoint)) delete next.waypoints[below.id]

  /*
   * Covered from above: split the covering marks.
   *
   * Every mark above — the file's, and any ancestor's — goes, and every
   * sibling along the way down from the highest one is marked instead. So only
   * this waypoint and the ones it sits inside show again. There can be more
   * than one mark above when a waypoint was marked inside a marked parent.
   */
  const fileCover = next.files[file.path] !== undefined
  const highest = ancestors.findIndex((step) => next.waypoints[step.id] !== undefined)
  if (!fileCover && highest === -1) return next

  delete next.files[file.path]
  for (const step of ancestors) delete next.waypoints[step.id]
  const levels = fileCover
    ? [file.waypoints, ...ancestors.map((step) => step.children ?? [])]
    : ancestors.slice(highest).map((step) => step.children ?? [])
  const onPath = new Set([...ancestors, waypoint].map((step) => step.id))
  for (const siblings of levels) {
    for (const sibling of siblings) {
      if (!onPath.has(sibling.id)) next.waypoints[sibling.id] = contentHash(sibling)
    }
  }
  return next
}

/** A request body's change, checked, or null. */
export function parseChange(value: unknown): ReviewedChange | null {
  if (value === null || typeof value !== "object") return null
  const record = value as Record<string, unknown>
  const op = record["op"]
  if (op !== "mark" && op !== "unmark") return null
  const waypoint = record["waypoint"]
  const file = record["file"]
  if (typeof waypoint === "string" && waypoint !== "" && file === undefined) {
    return { op, target: { waypoint } }
  }
  if (typeof file === "string" && file !== "" && waypoint === undefined) {
    return { op, target: { file } }
  }
  return null
}

/** Stored marks read back, or none when the file is not marks. */
export function parseMarks(value: unknown): ReviewedMarks {
  if (value === null || typeof value !== "object") return NO_MARKS
  const record = value as Record<string, unknown>
  const strings = (inner: unknown): Record<string, string> => {
    if (inner === null || typeof inner !== "object") return {}
    return Object.fromEntries(
      Object.entries(inner as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    )
  }
  return { version: 1, waypoints: strings(record["waypoints"]), files: strings(record["files"]) }
}
