/**
 * The paths a change touches.
 *
 * All that is left of a second diff parser. Reading which *lines* changed moved
 * to `./hunks`, which keeps the deleted ones as well — this file's own comment
 * used to say removals could not be shown, and that was only ever true while
 * the marks were computed from a raw diff at the moment of opening, with
 * nothing holding on to the text.
 *
 * The coverage count does not need any of that. It needs the file names, and a
 * pass that reads only the `+++` lines is both simpler and harder to get wrong
 * than one that has to track line numbers to answer the same question.
 */

import { headerPath } from "../../lib/git/diffFormat"

/** The paths a unified diff touches, for the coverage count. */
export function changedPaths(diff: string): string[] {
  const paths: string[] = []
  for (const raw of diff.split("\n")) {
    if (!raw.startsWith("+++ ")) continue
    const target = headerPath(raw)
    if (target !== null) paths.push(target)
  }
  return paths
}
