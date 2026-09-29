import { headerPath } from "../../../lib/git/diffFormat"
import type { ChangedFile } from "../../../lib/git-adapter/types"

/**
 * Splits a unified diff into one entry per file.
 *
 * Needed because three of the four adapters answer "what changed between these
 * commits" with a single block of diff text, while the staleness check works
 * per file: it asks whether *this* cited path changed, and whether the change
 * overlapped *these* cited lines. GitHub's compare API happens to return the
 * files already separated, which is why this did not exist before; GitLab's
 * `raw_diffs` and Bitbucket's `diff` do not, and neither does local git.
 *
 * The status is read from the extended headers rather than inferred from the
 * hunks. Inference gets renames wrong in the way that matters most: a pure
 * rename has no hunks at all, so a splitter that waits for `@@` drops the file
 * entirely, and the citation pointing at its old path is then reported as
 * perfectly current.
 */
export function splitDiff(diff: string): ChangedFile[] {
  const files: ChangedFile[] = []
  const lines = diff.split("\n")

  let current: ChangedFile | null = null
  let patch: string[] = []
  let sawHunk = false

  const flush = () => {
    if (current === null) return
    // Absent, not empty. `classify` treats a cited file with no patch as
    // affected, because it cannot prove the lines are fine — which is the right
    // answer for a binary file and the wrong one for "a patch that changed
    // nothing". An empty string would read as the latter.
    if (sawHunk) current.patch = patch.join("\n")
    files.push(current)
    current = null
    patch = []
    sawHunk = false
  }

  for (const line of lines) {
    if (line.startsWith("diff --git ")) {
      flush()
      current = { path: "", status: "modified" }
      continue
    }
    if (current === null) continue

    if (sawHunk) {
      patch.push(line)
      continue
    }

    if (line.startsWith("@@")) {
      sawHunk = true
      patch.push(line)
      continue
    }

    // Extended headers, before any hunk. Order is git's, not ours: `rename to`
    // and `+++` both name the new path, and whichever arrives is authoritative.
    if (line.startsWith("new file mode")) {
      current.status = "added"
      continue
    }
    if (line.startsWith("deleted file mode")) {
      current.status = "removed"
      continue
    }
    if (line.startsWith("rename from ")) {
      current.status = "renamed"
      current.previousPath = line.slice("rename from ".length).trim()
      continue
    }
    if (line.startsWith("rename to ")) {
      current.status = "renamed"
      current.path = line.slice("rename to ".length).trim()
      continue
    }
    if (line.startsWith("+++ ")) {
      // `/dev/null` on the new side means the file is gone, and the path has to
      // come from the old side instead.
      const target = headerPath(line)
      if (target !== null) current.path = target
      continue
    }
    if (line.startsWith("--- ")) {
      const target = headerPath(line)
      if (target !== null && current.path === "") current.path = target
      continue
    }
    if (line.startsWith("Binary files ")) {
      // Recorded as a change with no patch, which is exactly what the API-based
      // adapters report for one.
      if (current.path === "") current.path = binaryPath(line)
      continue
    }
  }
  flush()

  // A `diff --git` header with nothing after it names no file, and a file with
  // no name cannot be matched against a citation.
  return files.filter((file) => file.path !== "")
}

/** Drops git's `a/` and `b/` diff prefixes. */
/**
 * The path out of `Binary files a/x and b/x differ`.
 *
 * Only reached when neither `---` nor `+++` appeared, which is what git emits
 * for a binary change without `--binary`.
 */
function binaryPath(line: string): string {
  const match = /^Binary files a\/(.+?) and b\/(.+?) differ$/.exec(line.trim())
  const target = match?.[2] ?? match?.[1]
  return target === undefined ? "" : target
}
