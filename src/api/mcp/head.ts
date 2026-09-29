import * as fs from "node:fs/promises"
import * as path from "node:path"
import { readRepoFile } from "../../utils/repo"
import { hasCommit, readBlob } from "./blob"
import { sameCommit } from "../../lib/git-adapter/types"
import type { Repository } from "./repository"

/**
 * Where a walkthrough's references are read from.
 *
 * A walkthrough names the commit it was written against, and everything in it
 * is true of that commit and of nothing else. So the question is which copy of
 * the code to read, and **it is not the working tree**. Reviewing a branch you
 * have not checked out is the ordinary case and very nearly the whole point of
 * the tool: a reviewer reads somebody else's pull request from wherever they
 * happen to be sitting.
 *
 * This used to require the checkout to be *on* that commit, which was a
 * tolerable answer while a failure merely meant "stored, unchecked". It stopped
 * being tolerable when the write began refusing: it turned "we could not verify
 * this" into "check the branch out first", for a document that was correct all
 * along.
 *
 * So the files come from git's object database, which has every fetched commit
 * whatever the checkout is doing. The checkout is still consulted for one
 * thing — whether it happens to be sitting on the commit — because a language
 * server can only read symbols out of a file on disk, and that is only the
 * right file when the two agree.
 */

/** Why a walkthrough could not be checked against a working tree. */
export type Unchecked =
  | { ok: false; reason: "no-checkout" }
  | { ok: false; reason: "no-head" }
  /**
   * The commit is not in this checkout at all.
   *
   * Not "the checkout is elsewhere", which is ordinary and fine — the files are
   * read from the object database. This is the narrower case where the commit
   * has never been fetched, so there is nothing to read.
   */
  | { ok: false; reason: "unfetched"; on: string }

export type TreeFor =
  | { ok: true; repo: Repository; onDisk: boolean }
  | Unchecked

/**
 * The commit a checkout is sitting on, read out of `.git`.
 *
 * Read rather than asked for, like `currentBranch` beside it: the server is a
 * plain node process that may have no `git` on its PATH, and spawning one to
 * learn something that is sitting in a file would be a dependency bought for
 * nothing.
 *
 * Three forms, because all three are ordinary. `HEAD` holds a bare object name
 * when it is detached, which is what a checkout of a pull request head usually
 * is. Otherwise it names a ref, whose file may be **loose** under `refs/heads`
 * or **packed** into `packed-refs` after a garbage collection — and a reader
 * that knows only the loose form reports a perfectly ordinary checkout as
 * having no commit.
 */
export async function headSha(root: string): Promise<string | null> {
  const dir = await gitDir(root)
  if (dir === null) return null

  let head: string
  try {
    head = (await fs.readFile(path.join(dir, "HEAD"), "utf8")).trim()
  } catch {
    return null
  }

  const symbolic = /^ref:\s*(.+)$/.exec(head)
  if (symbolic === null) return /^[0-9a-f]{7,40}$/i.test(head) ? head : null

  const ref = symbolic[1]?.trim()
  if (ref === undefined || ref === "") return null

  try {
    const loose = (await fs.readFile(path.join(dir, ...ref.split("/")), "utf8")).trim()
    if (loose !== "") return loose
  } catch {
    // Packed, or gone. The next read decides which.
  }

  return await packed(dir, ref)
}

/**
 * Where `.git` actually is.
 *
 * A directory in the ordinary case, and a **file** in a linked worktree or a
 * submodule, holding `gitdir: <path>`. The file form is worth following rather
 * than treating as absent: somebody reviewing two branches at once is exactly
 * the person with a worktree, and telling them their repository has no commit
 * would be wrong in the case they most need this.
 */
async function gitDir(root: string): Promise<string | null> {
  const at = path.join(root, ".git")
  let stats
  try {
    stats = await fs.stat(at)
  } catch {
    return null
  }
  if (stats.isDirectory()) return at

  try {
    const pointer = /^gitdir:\s*(.+)$/m.exec(await fs.readFile(at, "utf8"))
    const target = pointer?.[1]?.trim()
    if (target === undefined || target === "") return null
    return path.isAbsolute(target) ? target : path.resolve(root, target)
  } catch {
    return null
  }
}

/**
 * One ref out of `packed-refs`, including a linked worktree's shared copy.
 *
 * A worktree keeps its own `HEAD` and shares everything else, so the refs a
 * symbolic `HEAD` names live in the directory `commondir` points at rather than
 * beside it.
 */
async function packed(dir: string, ref: string): Promise<string | null> {
  const places = [dir]
  try {
    const common = (await fs.readFile(path.join(dir, "commondir"), "utf8")).trim()
    if (common !== "") {
      places.push(path.isAbsolute(common) ? common : path.resolve(dir, common))
    }
  } catch {
    // No `commondir`, so this is not a linked worktree.
  }

  for (const place of places) {
    let text: string
    try {
      text = await fs.readFile(path.join(place, "packed-refs"), "utf8")
    } catch {
      continue
    }
    for (const line of text.split("\n")) {
      // `^<sha>` lines are the peeled tag targets, and never a branch.
      if (line.startsWith("#") || line.startsWith("^")) continue
      const [sha, name] = line.trim().split(/\s+/)
      if (sha !== undefined && name === ref) return sha
    }
    // A loose ref may still be sitting in the shared directory.
    try {
      const loose = (await fs.readFile(path.join(place, ...ref.split("/")), "utf8")).trim()
      if (loose !== "") return loose
    } catch {
      continue
    }
  }
  return null
}

export async function walkthroughRepository(
  root: string | null,
  /** The commit the document names, in `meta.head`. */
  wanted: string | undefined,
): Promise<TreeFor> {
  if (root === null) return { ok: false, reason: "no-checkout" }
  if (wanted === undefined || wanted.trim() === "") {
    return { ok: false, reason: "no-head" }
  }

  const on = await headSha(root)
  if (on === null) return { ok: false, reason: "no-checkout" }

  /*
   * The commit has to be here, but the checkout does not have to be on it.
   *
   * `sameCommit`, not `===`, for the one case where the checkout *is* on it: a
   * document may carry an abbreviated object name, and string equality would
   * call that a mismatch.
   */
  const here = sameCommit(on, wanted)
  if (!here && !(await hasCommit(root, wanted))) {
    return { ok: false, reason: "unfetched", on }
  }

  return {
    ok: true,
    /**
     * Whether the working tree is the commit's own files.
     *
     * Only then can a language server be asked where a symbol is: it reads
     * what is on disk, and on any other branch that is a different version of
     * the file.
     */
    onDisk: here,
    repo: {
      // The document's own name for the commit, so the messages quote what the
      // author wrote rather than a longer form of it.
      head: wanted,
      /*
       * From the object database unless the checkout is already there.
       *
       * `readRepoFile` for the matching case, because it confines the path to
       * the checkout and a walkthrough may have arrived on a pull request
       * anybody could write. `readBlob` confines it too, and hands the path to
       * git as part of a revision rather than joining it onto a directory.
       */
      readFile: async (file) =>
        here
          ? await readRepoFile(root, file).catch(() => null)
          : await readBlob(root, wanted, file),
      /*
       * Empty, which turns the coverage checks off.
       *
       * They need the diff, and the server has no way to reach one: the adapter
       * layer is extension-side and this process has no channel to ask it. An
       * empty answer is the honest one — it disables the checks rather than
       * making them wrong — and the checks it disables are the two that would
       * otherwise fire on every walkthrough: "no waypoint references a file
       * this pull request changes", which is an error, and the per-file
       * coverage warning.
       */
      changedFiles: async () => [],
    },
  }
}
