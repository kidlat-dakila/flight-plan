import { execFile } from "node:child_process"
import { promisify } from "node:util"
import gitUrlParse from "git-url-parse"

/**
 * Which repository a checkout is, answered by git alone.
 *
 * This used to be `gh repo view --json nameWithOwner`, and that was the single
 * most expensive assumption in the extension. Naming the repository is what the
 * plan list and the MCP checkout registry both need first, so a machine without
 * the GitHub CLI lost features that have nothing to do with GitHub — and lost them to a welcome screen about installing a CLI, which
 * reads as the extension being GitHub-only rather than as one lookup failing.
 *
 * The remote URL already holds the answer, in a file git wrote. So this asks
 * git, it needs no network, no token and no provider, and it is the one part of
 * the adapter layer that every code path may rely on unconditionally.
 */

const run = promisify(execFile)

export type Remote = {
  /**
   * The full host, e.g. `gitlab.example.com`.
   *
   * Whole, never reduced to a registrable domain. `git-url-parse` reports both
   * and they differ for exactly the hosts that matter: a GitHub Enterprise
   * server at `ghe.example.com` has `source: "example.com"`, so matching a
   * configured provider against `source` would accept every host under that
   * domain while rejecting the one somebody actually configured.
   */
  host: string
  /**
   * Everything before the last path segment.
   *
   * A slash in here is normal, not a bug: GitLab nests groups, so
   * `group/subgroup/project` has `group/subgroup` as its owner. Anything that
   * assumes one segment is wrong on GitLab, which is why this is a string and
   * not two fields.
   */
  owner: string
  /** The last path segment, without `.git`. */
  name: string
  /** `owner/name`: the form the tools, the storage paths and the panel use. */
  fullName: string
}

/**
 * Reads a remote URL, or null when it does not name a hosted repository.
 *
 * Null rather than a throw. A checkout with no remote, or one pointing at a
 * path on disk, is an ordinary state the panel has to explain in its own words;
 * making every caller catch an exception to discover it puts that explanation
 * in the wrong place and invites a bare `String(cause)` in the user interface.
 *
 * The parsing itself is `git-url-parse`, because the shapes are worse than they
 * look: scp-style `git@host:owner/repo.git` is not a URL, credentials may be
 * embedded, GitLab nests groups arbitrarily deep, and Bitbucket Data Center
 * writes both `/scm/PROJ/repo.git` and `/projects/PROJ/repos/repo` for the same
 * repository. It handles all of those; a hand-rolled split handles the first
 * two and quietly mangles the rest.
 */
export function parseRemote(url: string): Remote | null {
  const trimmed = url.trim()
  if (trimmed === "") return null

  let parsed
  try {
    parsed = gitUrlParse(trimmed)
  } catch {
    // A local path, or something that is not a remote at all.
    return null
  }

  const host = parsed.resource
  const owner = parsed.owner
  const name = parsed.name
  if (host === "" || owner === "" || name === "") return null

  return { host, owner, name, fullName: `${owner}/${name}` }
}

/** Every remote this checkout has, in git's own order. */
async function remoteNames(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await run("git", ["remote"], { cwd, timeout: 10_000 })
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
  } catch {
    // Not a repository, or git is not installed. Neither can be answered here.
    return []
  }
}

async function remoteUrl(cwd: string, name: string): Promise<string | null> {
  try {
    const { stdout } = await run("git", ["remote", "get-url", name], {
      cwd,
      timeout: 10_000,
    })
    return stdout.trim()
  } catch {
    return null
  }
}

/**
 * The repository a checkout points at, or null.
 *
 * `origin` first, then whatever else is there. Not everybody calls it origin: a
 * fork made with `gh repo fork` names the parent `upstream`, and somebody who
 * renamed theirs still has a repository this can name. The fallback costs one
 * command and removes a dead end that would otherwise look like "Flight Plan
 * cannot see this repository".
 */
export async function readRemote(cwd: string): Promise<Remote | null> {
  const names = await remoteNames(cwd)
  if (names.length === 0) return null

  const ordered = names.includes("origin")
    ? ["origin", ...names.filter((name) => name !== "origin")]
    : names

  for (const name of ordered) {
    const url = await remoteUrl(cwd, name)
    if (url === null) continue
    const parsed = parseRemote(url)
    if (parsed !== null) return parsed
  }
  return null
}

/**
 * `owner/name` for a checkout, or null.
 *
 * The replacement for the old `repoName`, with one deliberate difference: it
 * returns null instead of throwing. The old one threw a `GitHubError` that
 * three call sites caught and turned into an empty string anyway, which meant
 * the failure was constructed, thrown, caught and discarded on every activation
 * of a machine without `gh`.
 */
export async function repoName(cwd: string): Promise<string | null> {
  return (await readRemote(cwd))?.fullName ?? null
}
