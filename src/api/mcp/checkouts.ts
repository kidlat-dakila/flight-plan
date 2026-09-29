import * as fs from "node:fs/promises"
import * as path from "node:path"
import { REPO_PATTERN } from "./contract"

/**
 * Which local checkout is which repository.
 *
 * The plan tools need this and nothing else does. A walkthrough is checked
 * against a commit, which `gh` can fetch from anywhere; a plan is checked
 * against **the working tree on the current branch**, which only exists on
 * disk, in a directory the server has no other way to learn. The MCP server is
 * a plain node process spawned by the extension: it has no workspace, no
 * folders, and no idea where the user's code is.
 *
 * So the extension writes down what it knows. One line per repository, keyed by
 * `owner/repo`, refreshed whenever a window opens a folder. Keys cannot collide
 * across windows, which is why this is a map and not a single `repoRoot`: two
 * VS Code windows share one server and one configuration file, and a scalar
 * would have them overwrite each other.
 *
 * A missing entry is not an error. It means no window has this repository open,
 * and the honest consequence is that a plan's positions go unchecked rather
 * than being checked against the wrong tree.
 */

export const CHECKOUTS_FILE = "checkouts.json"

export function checkoutsPath(serverDirectory: string): string {
  return path.join(serverDirectory, CHECKOUTS_FILE)
}

/** `owner/repo` to absolute checkout path. */
export type Checkouts = Record<string, string>

export async function readCheckouts(
  serverDirectory: string,
): Promise<Checkouts> {
  let raw: string
  try {
    raw = await fs.readFile(checkoutsPath(serverDirectory), "utf8")
  } catch {
    return {}
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {}
  }
  if (parsed === null || typeof parsed !== "object") return {}

  const checkouts: Checkouts = {}
  for (const [repo, root] of Object.entries(parsed as Record<string, unknown>)) {
    // Validated on the way in, because this file is read to decide which
    // directory to read source from. A malformed key is dropped rather than
    // repaired: there is no honest repair for one.
    if (!REPO_PATTERN.test(repo)) continue
    if (typeof root !== "string" || !path.isAbsolute(root)) continue
    checkouts[repo] = root
  }
  return checkouts
}

/**
 * Records one checkout, leaving the others alone.
 *
 * Read-modify-write rather than replace, because each window knows only about
 * its own folders and a window that replaced the file would erase the others'.
 */
export async function recordCheckout(
  serverDirectory: string,
  repo: string,
  root: string,
): Promise<void> {
  if (!REPO_PATTERN.test(repo) || !path.isAbsolute(root)) return
  const existing = await readCheckouts(serverDirectory)
  if (existing[repo] === root) return
  await fs.mkdir(serverDirectory, { recursive: true })
  await fs.writeFile(
    checkoutsPath(serverDirectory),
    `${JSON.stringify({ ...existing, [repo]: root }, null, 2)}\n`,
    "utf8",
  )
}
