import fs from "node:fs"
import { syncBuiltinESMExports } from "node:module"
import * as path from "node:path"
import { groupBy } from "./group-by"
import { recordOf } from "./record"

export interface VirtualFiles {
  names: ReadonlySet<string>
  contents: ReadonlyMap<string, Buffer>
}

export interface Mounted {
  readonly unhandled: ReadonlyMap<string, readonly string[]>
  unmount: () => void
}

type Callable = (...args: unknown[]) => unknown
type Answer = (at: unknown, options?: unknown) => { value: unknown } | undefined
type Patch = readonly [name: string, patched: Callable]
interface Link { directory: string, name: string }

const SAMPLES = 5
const FILE_MODE = 0o100644
const DIRECTORY_MODE = 0o40755
const BLOCK_SIZE = 4096
const BLOCK_BYTES = 512
const CALLBACK_NAMES = ["readFile", "stat", "lstat", "readdir", "realpath", "readlink", "access"]
const CONSTRUCTOR_NAME = /^[A-Z]/

const isCallable = (value: unknown): value is Callable => typeof value === "function"

class MountGuard {
  private isMounted = false

  public readonly claim = (): void => {
    if (this.isMounted) throw new Error("A virtual root is already mounted.")
    this.isMounted = true
  }

  public readonly release = (): void => {
    this.isMounted = false
  }
}

class UnhandledCalls {
  private calls: ReadonlyMap<string, readonly string[]> = new Map()

  public readonly note = (name: string, at: string): void => {
    const held = this.calls.get(name) ?? []
    this.calls = new Map(this.calls).set(name, held.length < SAMPLES ? [...held, at] : held)
  }

  public readonly read = (): ReadonlyMap<string, readonly string[]> => this.calls
}

const guard = new MountGuard()

const linksOf = (file: string): Link[] => {
  const at = path.posix.dirname(file)
  const directory = at === "." ? "" : at
  return [{ directory, name: path.posix.basename(file) }, ...(directory === "" ? [] : linksOf(directory))]
}

const textOf = (at: unknown): string | null => {
  if (typeof at === "string") return at
  if (at instanceof URL) return at.pathname
  return Buffer.isBuffer(at) ? at.toString() : null
}

const failure = (code: "ENOENT" | "EINVAL" | "EIO", syscall: string, at: string): NodeJS.ErrnoException =>
  Object.assign(new Error(`${code}: ${syscall} '${at}'`), { code, syscall, path: at })

const outcomeOf = (run: () => unknown): [error: unknown, value?: unknown] => {
  try {
    return [null, run()]
  } catch (error) {
    return [error]
  }
}

const encodingOf = (options: unknown): BufferEncoding | null => {
  const named = typeof options === "string" ? options : recordOf(options)?.encoding
  return typeof named === "string" && Buffer.isEncoding(named) ? named : null
}

const patchedOn = (target: object, patches: readonly Patch[]): ReadonlyMap<string, unknown> => {
  const originals = new Map(patches.map(([name]) => [name, Reflect.get(target, name) as unknown]))
  patches.forEach(([name, patched]) => Reflect.set(target, name, patched))
  return originals
}

const restoredOn = (target: object, originals: ReadonlyMap<string, unknown>): void => {
  originals.forEach((original, name) => Reflect.set(target, name, original))
}

const withNative = ([name, patched]: Patch): Patch => {
  if (name === "realpathSync" || name === "realpath") Reflect.set(patched, "native", patched)
  return [name, patched]
}

export function mountVirtual(root: string, files: VirtualFiles): Mounted {
  guard.claim()

  const links = [...files.names].flatMap(linksOf)
  const directories = new Set<string>(["", ...links.map((link) => link.directory)])
  const children = new Map([...groupBy(links, (link) => link.directory)].map(([directory, group]) => [directory, new Set(group.map((link) => link.name))]))
  const unhandled = new UnhandledCalls()

  const prefix = `${root}/`
  const relativeOf = (at: unknown): string | null => {
    const text = textOf(at)
    if (text === null) return null
    const normal = path.posix.normalize(text)
    if (normal === root) return ""
    return normal.startsWith(prefix) ? normal.slice(prefix.length) : null
  }

  const exists = (relative: string): boolean => files.names.has(relative) || directories.has(relative)
  const stats = (relative: string): fs.Stats => {
    const isFile = files.names.has(relative)
    const size = files.contents.get(relative)?.length ?? 0
    const epoch = new Date(0)
    return {
      isFile: () => isFile,
      isDirectory: () => !isFile,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      size,
      mode: isFile ? FILE_MODE : DIRECTORY_MODE,
      mtime: epoch, mtimeMs: 0, ctime: epoch, ctimeMs: 0, atime: epoch, atimeMs: 0, birthtime: epoch, birthtimeMs: 0,
      dev: 0, ino: 0, nlink: 1, uid: 0, gid: 0, rdev: 0, blksize: BLOCK_SIZE, blocks: Math.ceil(size / BLOCK_BYTES),
    }
  }
  const entry = (directory: string, name: string): unknown => {
    const isFile = files.names.has(directory === "" ? name : `${directory}/${name}`)
    const parentPath = path.posix.join(root, directory)
    return {
      name, parentPath, path: parentPath,
      isFile: () => isFile, isDirectory: () => !isFile, isSymbolicLink: () => false,
      isFIFO: () => false, isSocket: () => false, isBlockDevice: () => false, isCharacterDevice: () => false,
    }
  }

  const namesIn = (directory: string): string[] => [...(children.get(directory) ?? [])].sort()
  const pathIn = (directory: string, name: string): string => (directory === "" ? name : `${directory}/${name}`)
  const listed = (relative: string, queue: readonly string[], isTyped: boolean, isRecursive: boolean): unknown[] => {
    if (queue.length === 0) return []
    const entries = queue.flatMap((directory) => {
      const below = directory === relative ? "" : `${directory.slice(relative === "" ? 0 : relative.length + 1)}/`
      return namesIn(directory).map((name) => (isTyped ? entry(directory, name) : `${below}${name}`))
    })
    const deeper = isRecursive
      ? queue.flatMap((directory) => namesIn(directory).map((name) => pathIn(directory, name)).filter((child) => directories.has(child)))
      : []
    return [...entries, ...listed(relative, deeper, isTyped, isRecursive)]
  }

  const stat: Answer = (at, options) => {
    const relative = relativeOf(at)
    if (relative === null) return undefined
    if (exists(relative)) return { value: stats(relative) }
    if (recordOf(options)?.throwIfNoEntry === false) return { value: undefined }
    throw failure("ENOENT", "stat", String(textOf(at)))
  }
  const answers: Record<string, Answer> = {
    readFileSync: (at, options) => {
      const relative = relativeOf(at)
      if (relative === null) return undefined
      const buffer = files.contents.get(relative)
      if (buffer === undefined) {
        if (files.names.has(relative)) unhandled.note("readFileSync (contents not loaded)", String(textOf(at)))
        throw failure(files.names.has(relative) ? "EIO" : "ENOENT", "open", String(textOf(at)))
      }
      const encoding = encodingOf(options)
      return { value: encoding === null ? Buffer.from(buffer) : buffer.toString(encoding) }
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
      const { withFileTypes, recursive } = recordOf(options) ?? {}
      return { value: listed(relative, [relative], withFileTypes === true, recursive === true) }
    },
    realpathSync: (at) => {
      const relative = relativeOf(at)
      if (relative === null) return undefined
      if (!exists(relative)) throw failure("ENOENT", "realpath", String(textOf(at)))
      return { value: relative === "" ? root : `${prefix}${relative}` }
    },
    readlinkSync: (at) => {
      if (relativeOf(at) === null) return undefined
      throw failure("EINVAL", "readlink", String(textOf(at)))
    },
  }

  const originalOf = (target: object, name: string): Callable => {
    const original: unknown = Reflect.get(target, name)
    if (!isCallable(original)) throw new TypeError(`fs.${name} is not a function`)
    return original
  }

  const answeredDirectly = (name: string, answer: Answer): Patch => {
    const original = originalOf(fs, name)
    return [
      name,
      (at, ...rest) => {
        const answered = answer(at, rest[0])
        return answered === undefined ? Reflect.apply(original, fs, [at, ...rest]) : answered.value
      },
    ]
  }

  const answeredByCallback = (name: string): Patch => {
    const original = originalOf(fs, name)
    const answer = answers[`${name}Sync`]
    return [
      name,
      (at, ...rest) => {
        const callback = rest[rest.length - 1]
        if (relativeOf(at) === null || !isCallable(callback)) return Reflect.apply(original, fs, [at, ...rest])
        process.nextTick(callback, ...outcomeOf(() => answer(at, rest.length > 1 ? rest[0] : undefined)?.value))
        return undefined
      },
    ]
  }

  const notedOn = (target: object, label: string, name: string): Patch => {
    const original = originalOf(target, name)
    return [
      name,
      (at, ...rest) => {
        if (relativeOf(at) !== null) unhandled.note(label, String(textOf(at)))
        return Reflect.apply(original, target, [at, ...rest])
      },
    ]
  }

  const answered = [
    ...Object.entries(answers).map(([name, answer]) => answeredDirectly(name, answer)),
    ...CALLBACK_NAMES.map(answeredByCallback),
  ].map(withNative)
  const answeredNames = new Set(answered.map(([name]) => name))
  const noted = Object.keys(fs)
    .filter((name) => !answeredNames.has(name) && isCallable(Reflect.get(fs, name)) && !CONSTRUCTOR_NAME.test(name))
    .map((name) => notedOn(fs, name, name))
  const notedPromises = Object.keys(fs.promises)
    .filter((name) => isCallable(Reflect.get(fs.promises, name)))
    .map((name) => notedOn(fs.promises, `promises.${name}`, name))

  const originals = patchedOn(fs, [...answered, ...noted])
  const promiseOriginals = patchedOn(fs.promises, notedPromises)
  syncBuiltinESMExports()

  return {
    get unhandled() {
      return unhandled.read()
    },
    unmount: () => {
      restoredOn(fs, originals)
      restoredOn(fs.promises, promiseOriginals)
      syncBuiltinESMExports()
      guard.release()
    },
  }
}
