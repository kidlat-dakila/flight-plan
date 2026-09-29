/**
 * A commit's files, served through `node:fs` under a made-up absolute root.
 *
 * Some libraries read the file system with Node's own `fs` and take no other
 * source: dependency-cruiser's resolver, for one, is fixed to the real disk.
 * The code graph reads a commit from git objects, with no checkout, so while
 * such a library runs, `mountVirtual` answers `fs` calls for paths under
 * `root` from memory. Every other path goes to the real `fs`, untouched.
 *
 * The sync calls and their callback forms that resolving and reading need are
 * answered. Any other `fs` function called with a path under `root` still goes
 * to the real `fs` (and finds nothing there) and is recorded in `unhandled`:
 * a non-empty list means the library read something this module does not
 * serve. Only one root is mounted at a time.
 */
import fs from "node:fs"
import { syncBuiltinESMExports } from "node:module"
import * as path from "node:path"

/** What is mounted: every path that exists, and the contents of those that can be read. */
export type VirtualFiles = {
  /** Every file, relative to the root, with `/`. */
  names: ReadonlySet<string>
  /** The contents of the files that can be read; the rest exist but cannot be read. */
  contents: ReadonlyMap<string, Buffer>
}

export type Mounted = {
  /** Calls with a path under the root that were not served, by `fs` function, with sample paths. */
  unhandled: ReadonlyMap<string, readonly string[]>
  /** Puts the real `fs` back. */
  unmount: () => void
}

type Patchable = Record<string, unknown> & { promises: Record<string, unknown> }

let mounted = false

const SAMPLES = 5

export function mountVirtual(root: string, files: VirtualFiles): Mounted {
  if (mounted) throw new Error("A virtual root is already mounted.")
  mounted = true

  const directories = new Set<string>([""])
  const children = new Map<string, Set<string>>()
  const childrenOf = (directory: string): Set<string> => {
    let held = children.get(directory)
    if (held === undefined) children.set(directory, (held = new Set()))
    return held
  }
  for (const file of files.names) {
    let child = file
    for (let at = path.posix.dirname(file); ; at = path.posix.dirname(at)) {
      const directory = at === "." ? "" : at
      childrenOf(directory).add(path.posix.basename(child))
      if (directories.has(directory)) break
      directories.add(directory)
      child = directory
    }
  }

  const unhandled = new Map<string, string[]>()
  const note = (name: string, at: string): void => {
    const held = unhandled.get(name) ?? []
    if (held.length < SAMPLES) held.push(at)
    unhandled.set(name, held)
  }

  const prefix = `${root}/`
  const textOf = (at: unknown): string | null =>
    typeof at === "string" ? at : at instanceof URL ? at.pathname : Buffer.isBuffer(at) ? at.toString() : null
  /** The path relative to the root, or null for a path outside it. */
  const relativeOf = (at: unknown): string | null => {
    const text = textOf(at)
    if (text === null) return null
    const normal = path.posix.normalize(text)
    if (normal === root) return ""
    return normal.startsWith(prefix) ? normal.slice(prefix.length) : null
  }

  const exists = (relative: string): boolean => files.names.has(relative) || directories.has(relative)
  const failure = (code: "ENOENT" | "EINVAL" | "EIO", syscall: string, at: string): NodeJS.ErrnoException =>
    Object.assign(new Error(`${code}: ${syscall} '${at}'`), { code, syscall, path: at })
  const stats = (relative: string): fs.Stats => {
    const file = files.names.has(relative)
    const size = files.contents.get(relative)?.length ?? 0
    const epoch = new Date(0)
    return {
      isFile: () => file,
      isDirectory: () => !file,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      size,
      mode: file ? 0o100644 : 0o40755,
      mtime: epoch, mtimeMs: 0, ctime: epoch, ctimeMs: 0, atime: epoch, atimeMs: 0, birthtime: epoch, birthtimeMs: 0,
      dev: 0, ino: 0, nlink: 1, uid: 0, gid: 0, rdev: 0, blksize: 4096, blocks: Math.ceil(size / 512),
    } as fs.Stats
  }
  const entry = (directory: string, name: string): fs.Dirent => {
    const file = files.names.has(directory === "" ? name : `${directory}/${name}`)
    const parentPath = path.posix.join(root, directory)
    return {
      name, parentPath, path: parentPath,
      isFile: () => file, isDirectory: () => !file, isSymbolicLink: () => false,
      isFIFO: () => false, isSocket: () => false, isBlockDevice: () => false, isCharacterDevice: () => false,
    } as unknown as fs.Dirent
  }

  /** A sync answer; `undefined` means "not a path under the root". */
  type Answer = (at: unknown, options?: unknown) => { value: unknown } | undefined
  const stat: Answer = (at, options) => {
    const relative = relativeOf(at)
    if (relative === null) return undefined
    if (exists(relative)) return { value: stats(relative) }
    if ((options as { throwIfNoEntry?: boolean } | undefined)?.throwIfNoEntry === false) return { value: undefined }
    throw failure("ENOENT", "stat", String(textOf(at)))
  }
  const answers: Record<string, Answer> = {
    readFileSync: (at, options) => {
      const relative = relativeOf(at)
      if (relative === null) return undefined
      const buffer = files.contents.get(relative)
      if (buffer === undefined) {
        if (files.names.has(relative)) note("readFileSync (contents not loaded)", String(textOf(at)))
        throw failure(files.names.has(relative) ? "EIO" : "ENOENT", "open", String(textOf(at)))
      }
      const encoding = (typeof options === "string" ? options : (options as { encoding?: string } | undefined)?.encoding) as BufferEncoding | undefined
      return { value: encoding ? buffer.toString(encoding) : Buffer.from(buffer) }
    },
    statSync: stat,
    lstatSync: stat,
    existsSync: (at) => {
      const relative = relativeOf(at)
      return relative === null ? undefined : { value: exists(relative) }
    },
    accessSync: (at) => {
      const relative = relativeOf(at)
      if (relative === null) return undefined
      if (!exists(relative)) throw failure("ENOENT", "access", String(textOf(at)))
      return { value: undefined }
    },
    readdirSync: (at, options) => {
      const relative = relativeOf(at)
      if (relative === null) return undefined
      if (!directories.has(relative)) throw failure("ENOENT", "scandir", String(textOf(at)))
      const { withFileTypes, recursive } = (options ?? {}) as { withFileTypes?: boolean; recursive?: boolean }
      const typed = withFileTypes === true
      /*
       * Recursive, as Node lists it: one folder's entries, then each subfolder's
       * in turn, every name relative to `at`. dependency-cruiser lists this way
       * to expand a path it reads as a glob, and a route folder such as
       * `[orderId]` or `(shop)` reads as one. Answering one level only matched
       * nothing, and the file was dropped from the graph without an error.
       */
      const out: unknown[] = []
      const queue = [relative]
      for (let head = 0; head < queue.length; head += 1) {
        const directory = queue[head] as string
        const below = directory === relative ? "" : `${directory.slice(relative === "" ? 0 : relative.length + 1)}/`
        for (const name of [...(children.get(directory) ?? [])].sort()) {
          out.push(typed ? entry(directory, name) : `${below}${name}`)
          const child = directory === "" ? name : `${directory}/${name}`
          if (recursive === true && directories.has(child)) queue.push(child)
        }
      }
      return { value: out }
    },
    realpathSync: (at) => {
      const relative = relativeOf(at)
      if (relative === null) return undefined
      if (!exists(relative)) throw failure("ENOENT", "realpath", String(textOf(at)))
      return { value: relative === "" ? root : `${prefix}${relative}` }
    },
    // Git objects hold no symbolic links to follow.
    readlinkSync: (at) => {
      if (relativeOf(at) === null) return undefined
      throw failure("EINVAL", "readlink", String(textOf(at)))
    },
  }

  const real = fs as unknown as Patchable
  const originals = new Map<string, unknown>()
  const replace = (name: string, next: unknown): void => {
    if (!originals.has(name)) originals.set(name, real[name])
    real[name] = next
  }

  for (const [name, answer] of Object.entries(answers)) {
    const original = real[name] as (...args: unknown[]) => unknown
    replace(name, (at: unknown, ...rest: unknown[]) => {
      const answered = answer(at, rest[0])
      return answered === undefined ? original.call(fs, at, ...rest) : answered.value
    })
  }
  ;(real.realpathSync as { native?: unknown }).native = real.realpathSync

  // The callback forms, answered from the sync ones.
  for (const name of ["readFile", "stat", "lstat", "readdir", "realpath", "readlink", "access"]) {
    const original = real[name] as (...args: unknown[]) => unknown
    const answer = answers[`${name}Sync`] as Answer
    replace(name, (at: unknown, ...rest: unknown[]) => {
      const callback = rest.pop() as (error: unknown, value?: unknown) => void
      if (relativeOf(at) === null) return original.call(fs, at, ...rest, callback)
      let value: unknown
      try {
        value = answer(at, rest[0])?.value
      } catch (error) {
        process.nextTick(callback, error)
        return undefined
      }
      process.nextTick(callback, null, value)
      return undefined
    })
  }
  ;(real.realpath as { native?: unknown }).native = real.realpath

  // Everything else goes to the real fs; a path under the root is recorded.
  for (const name of Object.keys(real)) {
    const original = real[name]
    if (originals.has(name) || typeof original !== "function" || /^[A-Z]/.test(name)) continue
    replace(name, function (this: unknown, at: unknown, ...rest: unknown[]) {
      if (relativeOf(at) !== null) note(name, String(textOf(at)))
      return (original as (...args: unknown[]) => unknown).call(fs, at, ...rest)
    })
  }
  const promises = real.promises
  const promiseOriginals = new Map<string, unknown>()
  for (const name of Object.keys(promises)) {
    const original = promises[name]
    if (typeof original !== "function") continue
    promiseOriginals.set(name, original)
    promises[name] = (at: unknown, ...rest: unknown[]) => {
      if (relativeOf(at) !== null) note(`promises.${name}`, String(textOf(at)))
      return (original as (...args: unknown[]) => unknown).call(promises, at, ...rest)
    }
  }
  syncBuiltinESMExports()

  return {
    unhandled,
    unmount: () => {
      for (const [name, original] of originals) real[name] = original
      for (const [name, original] of promiseOriginals) promises[name] = original
      syncBuiltinESMExports()
      mounted = false
    },
  }
}
