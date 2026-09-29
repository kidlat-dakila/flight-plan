/**
 * The two pieces of git's unified diff format that every diff reader here
 * needs: the `@@` hunk header and the path on a `---` / `+++` file header.
 *
 * Each reader keeps its own walk over the lines, because each returns a
 * different shape (hunks per path, patches per file, changed paths, changed
 * ranges). What they share is how a header line is read, and that lives here
 * so the rules cannot drift apart.
 */

/** A hunk header, `@@ -oldStart,oldCount +newStart,newCount @@`. */
export type HunkHeader = {
  oldStart: number
  /** Lines on the old side. 1 when the header leaves the count out, as git does for one line. */
  oldCount: number
  newStart: number
  /**
   * Lines on the new side, 1 when left out. 0 means the hunk only deletes;
   * `newStart` is then the line the deletion sits *after*, not before.
   */
  newCount: number
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))?/

/** The numbers of a hunk header line, or null when the line is not one. */
export function parseHunkHeader(line: string): HunkHeader | null {
  const match = HUNK_HEADER.exec(line)
  if (match === null) return null
  return {
    oldStart: Number(match[1]),
    oldCount: match[2] === undefined ? 1 : Number(match[2]),
    newStart: Number(match[3]),
    newCount: match[4] === undefined ? 1 : Number(match[4]),
  }
}

/**
 * The path a `--- a/…` or `+++ b/…` line names, or null for `/dev/null`.
 *
 * The prefix is side-aware: `a/` only on the old side, `b/` only on the new,
 * so a real top-level folder named `a` or `b` survives on the other side.
 * Trimmed, because git ends a path that contains a space with a tab.
 */
export function headerPath(line: string): string | null {
  const target = line.slice(4).trim()
  if (target === "/dev/null") return null
  const prefix = line.startsWith("+++ ") ? "b/" : "a/"
  return target.startsWith(prefix) ? target.slice(prefix.length) : target
}
