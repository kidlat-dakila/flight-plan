import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { readRepoFile } from "../repo"
import { GitAdapterError, type GitAdapter } from "../../lib/git-adapter/types"

const run = promisify(execFile)

/**
 * Where a walkthrough's code references are read from.
 *
 * This is not a detail. A walkthrough is written against a **commit**: the
 * author, or their assistant, checked every line range against the files as they
 * are at the head of the pull request. The reader's working tree is a different
 * thing entirely, usually a different branch, and reading references from it
 * produces the two worst outcomes available. A file added by the pull request is
 * reported as missing, which at least looks like an error. A file that merely
 * *changed* resolves silently to the base version, and the walkthrough then
 * highlights confidently wrong lines with nothing to indicate it.
 *
 * So a walkthrough opened from a pull request reads at that pull request's head
 * commit, always, even when the branch happens to be checked out.
 */
export type Source =
  | { kind: "worktree"; root: string }
  | {
      kind: "commit"
      root: string
      repo: string
      sha: string
      /**
       * How to reach the host when the commit is not on this machine.
       *
       * Null when there is no adapter, which is an ordinary state rather than a
       * failure: somebody on plain git with the branch fetched reads every
       * file locally and never needs one. It becomes a failure only for a
       * commit the checkout does not have, and the panel says so in those
       * words rather than reporting a missing file.
       */
      gitAdapter: GitAdapter | null
    }

export class SourceError extends Error {}

/** Reads a file out of a commit that is already in the local object store. */
async function fromGit(root: string, sha: string, path: string): Promise<string | null> {
  try {
    const { stdout } = await run("git", ["show", `${sha}:${path}`], {
      cwd: root,
      timeout: 20_000,
      maxBuffer: 16 * 1024 * 1024,
    })
    return stdout
  } catch {
    // The commit is not fetched, or the path is not in it. Both are answered by
    // asking GitHub; only GitHub can tell the two apart.
    return null
  }
}

/**
 * Reads a file out of a commit through whichever host is configured.
 *
 * Reached only when the local object store does not have the commit, which is
 * the ordinary case for somebody reviewing a branch they have not fetched.
 */
async function fromGitAdapter(
  gitAdapter: GitAdapter | null,
  repo: string,
  sha: string,
  path: string,
): Promise<string> {
  if (gitAdapter === null || !gitAdapter.supports("blob")) {
    throw new SourceError(
      `${path} at ${sha.slice(0, 8)} is not in this checkout, and Flight Plan ` +
        `has no way to fetch it. Fetch the branch, or set up a way to reach ` +
        `your code host in Flight Plan's setup.`,
    )
  }
  try {
    return await gitAdapter.blob(path, sha)
  } catch (cause) {
    throw new SourceError(
      cause instanceof GitAdapterError || cause instanceof Error
        ? cause.message
        : `${path} could not be read from ${repo} at ${sha.slice(0, 8)}.`,
    )
  }
}

export async function readFromSource(
  source: Source,
  path: string,
): Promise<string> {
  if (source.kind === "worktree") return readRepoFile(source.root, path)

  // Local first: it is instant, works offline, and for a branch that has been
  // fetched it is the same bytes the host would return.
  const local = await fromGit(source.root, source.sha, path)
  if (local !== null) return local
  return fromGitAdapter(source.gitAdapter, source.repo, source.sha, path)
}

/**
 * Which cited files can safely be opened in the editor.
 *
 * The obvious rule is "my pull request opens locally, somebody else's goes to
 * GitHub", and it is the wrong rule. What decides whether the editor shows the
 * right thing is not authorship, it is whether the file on disk *is* the file
 * the walkthrough was written against. Open a file locally while the checkout
 * sits on another branch and the editor shows a different version at the same
 * line numbers, which is precisely the silent failure that head-pinned
 * resolution and anchors were built to remove.
 *
 * So: `HEAD` must be the walkthrough's commit, and the file must be unmodified.
 * Both checks are one command each, run once when the panel opens. Anything
 * that fails either goes to GitHub, where the lines are certainly right.
 *
 * Authorship then follows on its own, without being consulted: you are usually
 * on your own branch and not on somebody else's.
 */
export async function locallyOpenable(
  root: string,
  sha: string,
  paths: readonly string[],
): Promise<string[]> {
  if (paths.length === 0) return []

  const head = await run("git", ["rev-parse", "HEAD"], { cwd: root, timeout: 10_000 })
    .then(({ stdout }) => stdout.trim())
    .catch(() => null)
  if (head !== sha) return []

  // Tracked changes, staged or not. A cited path that is untracked was not at
  // `HEAD` either, so it is covered by the commit check above.
  const modified = await run("git", ["diff", "--name-only", "HEAD"], {
    cwd: root,
    timeout: 15_000,
    maxBuffer: 8 * 1024 * 1024,
  })
    .then(({ stdout }) => new Set(stdout.split("\n").map((line) => line.trim())))
    .catch(() => null)
  if (modified === null) return []

  return paths.filter((path) => !modified.has(path))
}
