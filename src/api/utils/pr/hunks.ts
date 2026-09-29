import type { LineRange } from "../../../lib/schemas/document/primitives"
import { headerPath, parseHunkHeader } from "../../../lib/git/diffFormat"

/**
 * What a change did to each file, from a unified diff.
 *
 * **Nobody authors this.** A walkthrough says which file and which symbol it is
 * about; the diff says what changed. Asking an author to mark the change by
 * hand gives two sources of truth for one fact, and the marks are the half that
 * goes stale.
 *
 * Removals are the part that is new. `src/api/pr/patch.ts` discarded every `-` line
 * on the grounds that a removed line has no head-side number to mark, which is
 * true and is not the same as it being unshowable: the panel can draw the text
 * beneath the line it used to follow. That comparison — what the change cost —
 * is exactly what a reviewer leaves the panel to find today.
 */

/** Lines deleted, and the head-side line they sat after. 0 is the file's top. */
export type Removal = { after: number; lines: string[] }

export type Hunk = {
  /** Added line ranges, in head-side numbering, with runs merged. */
  added: LineRange[]
  removed: Removal[]
  /**
   * Set when the file did not exist before this change.
   *
   * Absent rather than false, because it is a mark rather than a field: only a
   * created file carries it. From the `---` header being `/dev/null`, which is
   * git saying there was no old side — not from the added lines looking like a
   * whole file, which an edit that replaces every line also looks like.
   *
   * The scaffold needs it because a created file arrives as one hunk, and one
   * waypoint for a file of any length is the one place the per-hunk rule does
   * not hold. See `walkthroughOf.ts`.
   */
  created?: true
}

export function hunksByPath(diff: string): Record<string, Hunk> {
  const byPath: Record<string, Hunk> = {}

  let path: string | null = null
  let line = 0
  let run: LineRange | null = null
  let deleted: string[] = []

  const hunk = (): Hunk | null =>
    path === null ? null : (byPath[path] ??= { added: [], removed: [] })

  const flushRun = (): void => {
    if (run !== null) hunk()?.added.push(run)
    run = null
  }

  /*
   * A removal is placed after the last head-side line before it.
   *
   * `line` is the next head-side line to be written, so the one before it is
   * where the deleted block sat. At the top of a file that is 0, which is the
   * only value the renderer needs to treat specially.
   */
  const flushDeleted = (): void => {
    if (deleted.length > 0) hunk()?.removed.push({ after: line - 1, lines: deleted })
    deleted = []
  }

  const lines = diff.split("\n")
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? ""

    /*
     * A file header is `--- old` immediately followed by `+++ new`.
     *
     * The **pair** is what identifies it, not the prefix. A deleted line
     * beginning with `-- ` — a SQL comment, a Markdown rule — reaches this
     * parser as `--- ` and is indistinguishable from a header on its own. That
     * was not hypothetical: reading the prefix alone attributed every `--- a/…`
     * header to the *previous* file as deleted content, and it showed up only
     * on a diff touching several files where more than one had deletions.
     *
     * The path comes from `+++`, not from `diff --git`, which quotes and
     * escapes paths where `+++` gives the plain one.
     */
    const next = lines[index + 1]
    if (raw.startsWith("--- ") && next !== undefined && next.startsWith("+++ ")) {
      flushRun()
      flushDeleted()
      path = headerPath(next)
      /*
       * No old side means the file is new.
       *
       * Recorded here rather than inferred later: the record has to exist
       * before any `+` line reaches it, and `hunk()` creates it lazily on the
       * first one.
       */
      if (path !== null && headerPath(raw) === null) {
        byPath[path] = { added: [], removed: [], created: true }
      }
      line = 0
      // Both header lines are consumed; the `+++` must not fall through.
      index += 1
      continue
    }
    if (raw.startsWith("@@")) {
      flushRun()
      flushDeleted()
      const header = parseHunkHeader(raw)
      if (header === null) {
        line = 0
        continue
      }
      /*
       * A head-side count of zero means the hunk only deletes.
       *
       * Git then writes the position of the line the deletion sat *after*,
       * rather than the line it sat before — `@@ -48 +47,0 @@` for a line
       * removed from between new lines 47 and 48. Every other hunk names the
       * first line it writes. Reading the two the same way puts a removal one
       * line too high, which is invisible at three lines of context and
       * constant at zero, and zero is what this parser is given.
       */
      line = header.newCount === 0 ? header.newStart + 1 : header.newStart
      continue
    }
    if (path === null || line === 0) continue

    if (raw.startsWith("+")) {
      flushDeleted()
      if (run !== null && run.to === line - 1) run.to = line
      else {
        flushRun()
        run = { from: line, to: line }
      }
      line += 1
      continue
    }
    if (raw.startsWith("-")) {
      flushRun()
      deleted.push(raw.slice(1))
      continue
    }
    // `\ No newline at end of file` advances nothing and is not context.
    if (raw.startsWith("\\")) continue

    flushRun()
    flushDeleted()
    line += 1
  }

  flushRun()
  flushDeleted()
  return byPath
}
