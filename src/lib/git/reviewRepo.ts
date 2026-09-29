/**
 * The review repo: `origin/main` with the branch's changes overlaid, in memory.
 *
 * Everything the diagram pipeline needs to run against a change, read straight
 * from the object database with **no checkout and no working-tree writes**:
 *
 *   - **repo** — the file set from the branch head (so files the branch added
 *     are present and the import chain never dangles), reading each changed file
 *     from the head and every other file from `origin/main`. That is the
 *     "origin/main + diff" state: the mainline codebase with just this change's
 *     files swapped to their head versions, so the reach is described against
 *     main rather than against unrelated branch drift.
 *   - **candidates** — the real `git grep` "who names this" search, at main and
 *     always including the changed files.
 *   - **files** — the changed files with their head-side line ranges, ready to
 *     hand to {@link buildDiagramTree}.
 *
 * The repo shape returned is language-neutral — `RepoBase`, just the file set
 * and a reader. Per-language resolution (TypeScript's tsconfig aliases and
 * workspace packages, Python's import roots and packages) is built later, one
 * language at a time, by {@link buildMultiLanguageDiagram} calling each
 * language's `makeRepo` over this same base.
 */
import { execFile, spawn } from "node:child_process"
import { promisify } from "node:util"
import type { ChangedFile } from "../codegraph/buildDiagramTree"
import type { CallCandidates } from "../codegraph/tracer/language"
import { allExtensions, type RepoBase } from "../codegraph/tracer/languages"
import { headerPath, parseHunkHeader } from "./diffFormat"

const run = promisify(execFile)

export type ReviewRepoInput = {
  /** The repository root (a real git repo; nothing is checked out). */
  root: string
  /** The base ref — `origin/main`. */
  base: string
  /** The branch head ref under review. */
  head: string
}

export type ReviewRepo = {
  base: RepoBase
  candidates: CallCandidates
  files: ChangedFile[]
}

/** How long any single git invocation may take before it is abandoned. */
const BUDGET_MS = 20_000

const options = (root: string) => ({
  cwd: root,
  maxBuffer: 64 * 1024 * 1024,
  windowsHide: true,
  timeout: BUDGET_MS,
})

/** Whether a string is safe to hand to git as a revision. */
const revision = (ref: string): boolean => ref !== "" && !ref.startsWith("-") && !/[\s:]/.test(ref)

/** Every tracked path at a ref, as a set. */
async function filesAt(root: string, ref: string): Promise<Set<string>> {
  if (!revision(ref)) return new Set()
  try {
    const { stdout } = await run("git", ["ls-tree", "-r", "--name-only", "-z", ref], options(root))
    return new Set(stdout.split("\0").filter((one) => one !== ""))
  } catch {
    return new Set()
  }
}

/** One file's bytes at a ref, or null when it is not there. */
async function readBlob(root: string, ref: string, file: string): Promise<string | null> {
  if (!revision(ref)) return null
  try {
    const { stdout } = await run("git", ["show", `${ref}:${file}`], options(root))
    return stdout
  } catch {
    return null
  }
}

/**
 * Many blobs in one `git cat-file --batch`, each named `<ref>:<path>`, in the
 * same order; null for one that is not there. A path with a line break cannot
 * be named on the batch's input and comes back null too.
 */
async function readBlobs(root: string, objects: readonly string[]): Promise<(string | null)[]> {
  if (objects.length === 0) return []
  const named = objects.map((one) => !one.includes("\n") && revision(one.slice(0, one.indexOf(":"))))
  const asked = objects.filter((_, at) => named[at])
  const chunks: Buffer[] = []
  const done = await new Promise<boolean>((settle) => {
    const child = spawn("git", ["cat-file", "--batch"], { cwd: root, windowsHide: true, timeout: BUDGET_MS * 3 })
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk))
    child.on("error", () => settle(false))
    child.on("close", (code) => settle(code === 0))
    child.stdin.end(`${asked.join("\n")}\n`)
  })
  const out: (string | null)[] = objects.map(() => null)
  if (!done) return out
  const all = Buffer.concat(chunks)
  let at = 0
  let next = 0
  for (let index = 0; index < objects.length; index++) {
    if (!named[index]) continue
    const header = all.indexOf(0x0a, at)
    if (header === -1) break
    const fields = all.subarray(at, header).toString("utf8").split(" ")
    next = header + 1
    // `<name> missing`, or `<sha> blob <size>` then the bytes and a line break.
    if (fields[1] === "blob") {
      const size = Number(fields[2])
      out[index] = all.subarray(next, next + size).toString("utf8")
      next += size + 1
    }
    at = next
  }
  return out
}

/** The new-side path a `+++ b/<path>` header names, or null for a deletion. */
/**
 * The branch's changed files and their head-side line ranges.
 *
 * Parsed from `git diff --unified=0 base...head` (three-dot: the branch's own
 * changes since it diverged, not main's advance). Each `+++ b/<path>` opens a
 * file; each `@@ … +c,d @@` is a head-side range `[c, c+d-1]`. A pure deletion
 * hunk (`d` is 0) adds no line and is skipped; a file with no added lines yields
 * no range. `changed` is every new-side path touched (for read routing), even
 * one edited only by deletions.
 */
async function changedFiles(
  root: string,
  base: string,
  head: string,
): Promise<{ files: ChangedFile[]; changed: Set<string> }> {
  const changed = new Set<string>()
  const ranges = new Map<string, [number, number][]>()
  if (!revision(base) || !revision(head)) return { files: [], changed }

  let stdout = ""
  try {
    ;({ stdout } = await run(
      "git",
      ["diff", "--unified=0", "--no-color", `${base}...${head}`],
      options(root),
    ))
  } catch {
    return { files: [], changed }
  }

  let current: string | null = null
  for (const line of stdout.split("\n")) {
    if (line.startsWith("+++ ")) {
      current = headerPath(line)
      if (current !== null) changed.add(current)
      continue
    }
    if (line.startsWith("@@") && current !== null) {
      const header = parseHunkHeader(line)
      if (header === null) continue
      const start = header.newStart
      const count = header.newCount
      if (count === 0) continue // a pure deletion adds no head line
      const list = ranges.get(current) ?? []
      list.push([start, start + count - 1])
      ranges.set(current, list)
    }
  }

  const files = [...ranges].map(([path, changes]) => ({ path, changes }))
  return { files, changed }
}

/** Files at `ref` naming an identifier as a whole word, narrowed to readable ones. */
async function mentioning(root: string, ref: string, name: string): Promise<string[]> {
  if (!revision(ref) || !/^[A-Za-z_$][\w$]*$/.test(name)) return []
  const pathspecs = allExtensions().map((extension) => `*${extension}`)
  try {
    const { stdout } = await run(
      "git",
      ["grep", "-l", "-I", "-w", "-z", "--fixed-strings", "-e", name, ref, "--", ...pathspecs],
      options(root),
    )
    return stdout
      .split("\0")
      .filter((one) => one !== "")
      // Entries come back as `<ref>:<path>`.
      .map((one) => (one.startsWith(`${ref}:`) ? one.slice(ref.length + 1) : one))
  } catch {
    return []
  }
}

export async function reviewRepo({ root, base, head }: ReviewRepoInput): Promise<ReviewRepo> {
  const [files, { files: changedList, changed }] = await Promise.all([
    filesAt(root, head),
    changedFiles(root, base, head),
  ])

  // Each file is read once per review, one at a time or many in a batch.
  const texts = new Map<string, Promise<string | null>>()
  const read = (file: string): Promise<string | null> => {
    let held = texts.get(file)
    if (held === undefined) {
      // A changed file is read from the head (it carries the change); everything
      // else from main, falling back to head for a file an earlier branch commit
      // added that main never had.
      held = changed.has(file)
        ? readBlob(root, head, file)
        : readBlob(root, base, file).then(async (text) => text ?? (await readBlob(root, head, file)))
      texts.set(file, held)
    }
    return held
  }
  // The same, for many files in two batches: the ref each file is read from,
  // then the head for the ones main does not have.
  const readAll = async (paths: readonly string[]): Promise<ReadonlyMap<string, string>> => {
    const wanted = [...new Set(paths)].filter((file) => files.has(file) && !texts.has(file))
    const first = await readBlobs(root, wanted.map((file) => `${changed.has(file) ? head : base}:${file}`))
    const again = wanted.filter((file, at) => first[at] === null && !changed.has(file))
    const second = await readBlobs(root, again.map((file) => `${head}:${file}`))
    wanted.forEach((file, at) => {
      const text = first[at] ?? null
      if (text !== null) texts.set(file, Promise.resolve(text))
    })
    again.forEach((file, at) => {
      const text = second[at] ?? null
      if (text !== null) texts.set(file, Promise.resolve(text))
    })
    const out = new Map<string, string>()
    for (const file of paths) {
      const text = await read(file)
      if (text !== null) out.set(file, text)
    }
    return out
  }

  // The candidate search: files at main that name the target, plus every changed
  // file (a new or edited caller lives in the change itself). Verified for real
  // by the tracer, so this stays a loose over-set.
  const candidates: CallCandidates = async (target) => {
    const name = target.name.split(".").pop() ?? target.name
    const named = await mentioning(root, base, name)
    return [...new Set([...named, ...changed])]
  }

  return { base: { files, read, readAll }, candidates, files: changedList }
}

