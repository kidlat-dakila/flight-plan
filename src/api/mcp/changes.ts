import { execFile } from "node:child_process"
import { promisify } from "node:util"
import type { StoredDocument } from "../../lib/schemas/document/stored"
import { idsForPath } from "./projection"
import { headerPath } from "../../lib/git/diffFormat"

const run = promisify(execFile)

/**
 * The change itself, handed over instead of fetched.
 *
 * The scaffold has already read every changed file and worked out which hunks
 * each card covers, and then said none of it — so an agent writing a
 * walkthrough ran `git diff` on four files and `git show` on a new one to
 * learn what it was describing. That is the single largest thing the surface
 * made somebody else do.
 *
 * **Per file, with the board attached.** Each file carries the ids of the
 * cards and nodes that name it, so the correlation the scaffold already did is
 * not done a second time by the reader. A file whose `nodes` is empty is a
 * change nothing in the document mentions, which is worth knowing and is
 * invisible from every other angle.
 *
 * **Bounded on purpose.** A wrong base produces a diff of thousands of files,
 * and nothing about it looks wrong. Returning it whole would be a
 * context-window incident rather than a number somebody notices, so this pages
 * and always says the total.
 */

export type FileChange = {
  path: string
  status: "added" | "modified" | "deleted" | "renamed"
  /** Unified diff for this file alone, as git writes it. */
  patch: string
  /** Lines added and removed, counted rather than parsed again by the caller. */
  added: number
  removed: number
  /** Waypoint and node ids in this document that name this path. */
  nodes: string[]
}

export type Changes = {
  base: string
  head: string
  files: FileChange[]
  /** Every changed path, not only the page returned. */
  total: number
  /** Paths whose change no waypoint or node mentions. */
  unmentioned: string[]
  next?: string
}

/** One `git diff` per call, parsed into the files it touched. */
async function diffText(
  root: string,
  base: string,
  head: string,
  paths: readonly string[],
): Promise<string | null> {
  try {
    const { stdout } = await run(
      "git",
      [
        "diff",
        "--no-color",
        "--no-ext-diff",
        // Context, unlike `hunksBetween`. That one counts lines and throws the
        // text away; this one *is* the text, and a hunk with no surrounding
        // code reads as a fragment.
        "--unified=3",
        "--find-renames",
        `${base}...${head}`,
        ...(paths.length === 0 ? [] : ["--", ...paths]),
      ],
      { cwd: root, maxBuffer: 64 * 1024 * 1024, windowsHide: true },
    )
    return stdout
  } catch {
    return null
  }
}

/**
 * Split a whole-diff into one patch per file.
 *
 * Keyed off the `--- ` / `+++ ` pair rather than the prefix alone, for the
 * reason `src/api/pr/hunks.ts` gives: a removed line beginning `-- ` arrives here
 * as `--- ` and is indistinguishable from a header on its own.
 */
function byFile(diff: string): { path: string; patch: string; status: FileChange["status"] }[] {
  const out: { path: string; patch: string; status: FileChange["status"] }[] = []
  const lines = diff.split("\n")

  let path: string | null = null
  let status: FileChange["status"] = "modified"
  let body: string[] = []
  let fromDevNull = false

  const flush = (): void => {
    if (path !== null && body.length > 0) out.push({ path, patch: body.join("\n"), status })
    path = null
    body = []
    status = "modified"
    fromDevNull = false
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? ""
    if (raw.startsWith("diff --git ")) {
      flush()
      body.push(raw)
      continue
    }
    const next = lines[index + 1]
    if (raw.startsWith("--- ") && next !== undefined && next.startsWith("+++ ")) {
      fromDevNull = headerPath(raw) === null
      const target = headerPath(next)
      if (target === null) {
        status = "deleted"
        // The path of a deleted file is on the `---` side.
        path = headerPath(raw)
      } else {
        path = target
        status = fromDevNull ? "added" : "modified"
      }
      body.push(raw, next)
      index += 1
      continue
    }
    if (raw.startsWith("rename from ")) status = "renamed"
    body.push(raw)
  }
  flush()
  return out
}

function counted(patch: string): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const line of patch.split("\n")) {
    if (line.startsWith("+") && !line.startsWith("+++")) added += 1
    if (line.startsWith("-") && !line.startsWith("---")) removed += 1
  }
  return { added, removed }
}

export async function changesOf(
  root: string,
  doc: StoredDocument,
  options: { paths?: readonly string[]; limit?: number; after?: string } = {},
): Promise<Changes | { error: string }> {
  if (doc.meta.kind !== "walkthrough") {
    return {
      error:
        "A plan describes code that does not exist yet, so it has no diff. Read its waypoints instead — each one carries the code it proposes.",
    }
  }
  const base = doc.meta.base
  const head = doc.meta.head
  if (base === undefined || base === "") {
    return {
      error:
        "This walkthrough has no base recorded, so there is nothing to diff against. Scaffold it again with a base.",
    }
  }

  const diff = await diffText(root, base, head, options.paths ?? [])
  if (diff === null) {
    return {
      error: `Could not read the change between ${base.slice(0, 8)} and ${head.slice(0, 8)}. The commits may not be in this checkout.`,
    }
  }

  const all = byFile(diff)
  const annotated: FileChange[] = all.map((file) => ({
    path: file.path,
    status: file.status,
    patch: file.patch,
    ...counted(file.patch),
    nodes: idsForPath(doc, file.path),
  }))

  const unmentioned = annotated.filter((file) => file.nodes.length === 0).map((f) => f.path)

  /*
   * An id cursor rather than an offset.
   *
   * Paths are stable for a fixed pair of commits, so a cursor is exact and
   * cheap. An offset would be neither the moment anything filtered the list.
   */
  const from =
    options.after === undefined
      ? 0
      : annotated.findIndex((file) => file.path === options.after) + 1
  const limit = options.limit ?? 25
  const page = annotated.slice(from, from + limit)
  const last = page[page.length - 1]

  return {
    base,
    head,
    files: page,
    total: annotated.length,
    unmentioned,
    ...(from + limit < annotated.length && last !== undefined ? { next: last.path } : {}),
  }
}
