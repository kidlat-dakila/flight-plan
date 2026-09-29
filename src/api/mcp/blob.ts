import { execFile } from "node:child_process"
import { promisify } from "node:util"

const run = promisify(execFile)

/**
 * A file as it was at one commit, without checking that commit out.
 *
 * This is what lets somebody write a walkthrough about a branch they are not
 * sitting on, which is the ordinary case and very nearly the whole point of the
 * tool: a reviewer reads somebody else's pull request from wherever they happen
 * to be. Reading the working tree instead meant the document could only be
 * written from a checkout of the branch it described.
 *
 * Git keeps every fetched commit's files in its object database, so the commit
 * has to be present locally but nothing has to move. A commit that was never
 * fetched simply is not there, and that reads the same as a missing file — the
 * caller reports the path, and fetching is the fix.
 */

/** Whether a path is safe to hand to git as part of a revision. */
function confined(file: string): boolean {
  if (file === "" || file.startsWith("/") || file.startsWith("-")) return false
  // `..` anywhere, and a Windows drive letter, both escape the repository.
  const parts = file.split(/[\\/]/)
  return !parts.includes("..") && !/^[A-Za-z]:/.test(file)
}

/**
 * Reads one file at one commit, or null when it is not there.
 *
 * Null covers every way this can fail on purpose: a path the commit does not
 * have, a commit the checkout has never fetched, a repository with no git on
 * the path. None of them are worth telling apart here — the answer to all of
 * them is that this reference cannot be resolved, and the caller already says
 * so by path.
 */
export async function readBlob(
  root: string,
  commit: string,
  file: string,
): Promise<string | null> {
  if (!confined(file)) return null

  try {
    const { stdout } = await run(
      "git",
      // `--` so a path that looks like a flag is still read as a path, and
      // `cat-file` rather than `show` because it never paginates or colours.
      ["cat-file", "blob", `${commit}:${file}`],
      { cwd: root, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
    )
    return stdout
  } catch {
    return null
  }
}

/** Whether a commit is in this checkout's object database at all. */
export async function hasCommit(root: string, commit: string): Promise<boolean> {
  try {
    await run("git", ["cat-file", "-e", `${commit}^{commit}`], {
      cwd: root,
      windowsHide: true,
    })
    return true
  } catch {
    return false
  }
}

/**
 * The commit the mainline is on, or null when this checkout has no mainline.
 *
 * A reference the change does not touch is read here rather than on the branch:
 * the branch's copy is whatever it was when somebody forked, and a reader
 * sent to a month-old version of a file nobody changed has been sent to the
 * wrong code. `origin/HEAD` first, because it is what the remote itself says
 * the default branch is; the named fallbacks are for a clone that never set it.
 *
 * Null is an ordinary state -- a repository with no remote, a fresh clone with
 * nothing fetched -- and it simply leaves every reference resolving on the
 * branch, which is what happened before this existed.
 */
const MAINLINE_REFS = [
  "refs/remotes/origin/HEAD",
  "refs/remotes/origin/main",
  "refs/remotes/origin/master",
  "refs/remotes/origin/trunk",
]

export async function mainlineCommit(root: string): Promise<string | null> {
  for (const ref of MAINLINE_REFS) {
    try {
      const { stdout } = await run("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
        cwd: root,
        windowsHide: true,
      })
      const sha = stdout.trim()
      if (sha !== "") return sha
    } catch {
      continue
    }
  }
  return null
}
