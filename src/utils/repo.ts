import * as fs from "node:fs/promises"
import * as path from "node:path"

/**
 * Reads repository files on behalf of a walkthrough.
 *
 * A walkthrough is a document, and a document that names file paths is
 * untrusted input: it may have arrived on a pull request written by someone
 * else. So the path it names is never used directly. It is resolved against one
 * root and rejected if it leaves it, which is the whole reason this lives on
 * the extension side rather than in the webview.
 */

/** Refuse anything larger, so one bad path cannot stall the panel. */
export const MAX_FILE_BYTES = 2 * 1024 * 1024

export class FileAccessError extends Error {}

/**
 * Absolute path for a repository-relative path, or null when it escapes.
 *
 * `path.resolve` collapses `..` before the check, so `a/../../etc/passwd` is
 * caught. The trailing separator matters: without it `/repo-secrets` would pass
 * the prefix test against a root of `/repo`.
 */
export function resolveInRoot(root: string, relative: string): string | null {
  if (relative.trim() === "") return null
  if (path.isAbsolute(relative)) return null

  const base = path.resolve(root)
  const target = path.resolve(base, relative)
  if (target === base) return null
  return target.startsWith(base + path.sep) ? target : null
}

/** Reads one repository-relative file as UTF-8. */
export async function readRepoFile(
  root: string,
  relative: string,
): Promise<string> {
  const target = resolveInRoot(root, relative)
  if (target === null) {
    throw new FileAccessError(
      `${relative} is outside the repository and was not read.`,
    )
  }

  let stats
  try {
    stats = await fs.stat(target)
  } catch {
    throw new FileAccessError(`${relative} does not exist in this repository.`)
  }
  if (!stats.isFile()) {
    throw new FileAccessError(`${relative} is not a file.`)
  }
  if (stats.size > MAX_FILE_BYTES) {
    throw new FileAccessError(
      `${relative} is ${Math.round(stats.size / 1024)} KB, too large to show.`,
    )
  }

  return fs.readFile(target, "utf8")
}
