import * as crypto from "node:crypto"

/**
 * Links from a waypoint back to the exact lines in the pull request's diff.
 *
 * The anchor is a pure function of data already to hand, with no API call:
 * GitHub keys each file in a diff on the **plain SHA-256 of its repo-relative
 * path**, so the hash of a changed file's path is the anchor of that file and
 * of no other.
 *
 * `R` is the right-hand side, so the numbers are head-version line numbers,
 * which is already the substrate a walkthrough cites. `L` would be the base
 * side, needed only for lines a change deletes.
 *
 * `/files` rather than `/changes`: it has been the canonical diff route for
 * years, and an old link should keep working.
 */

export function diffAnchor(path: string): string {
  return crypto.createHash("sha256").update(path, "utf8").digest("hex")
}

export function permalink(
  repo: string,
  pr: number,
  path: string,
  range?: { from: number; to: number },
): string {
  const base = `https://github.com/${repo}/pull/${String(pr)}/files#diff-${diffAnchor(path)}`
  if (range === undefined) return base
  return range.from === range.to
    ? `${base}R${String(range.from)}`
    : `${base}R${String(range.from)}-R${String(range.to)}`
}
