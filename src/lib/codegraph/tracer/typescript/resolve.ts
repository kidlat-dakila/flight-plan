/**
 * Which file a module specifier names, for the version of the repository that
 * git holds.
 *
 * enhanced-resolve decides it: relative paths, tsconfig `paths` and `baseUrl`
 * through every `extends`, index files, extension probing, the emitted-`.js`
 * convention and package.json entry fields. Its file system is the
 * repository's file set and reader, never the disk, so the answer is exact
 * for that version and needs no checkout.
 *
 * Four things are set up here, because enhanced-resolve cannot know them from
 * git alone or decides them differently from TypeScript:
 * - which `tsconfig.json` governs a file: the nearest one at or above it, as
 *   TypeScript picks it, whether or not it declares anything; so there is one
 *   resolver per config;
 * - where a workspace package lives: git holds no `node_modules` links, so
 *   every tracked package.json with a name becomes an alias to its directory;
 * - where a `paths` target points: TypeScript resolves it against the config
 *   that declares it (its `baseUrl`, else its directory), enhanced-resolve
 *   against the config that extends it. So each config is served with its
 *   targets already absolute (see {@link rootedPaths});
 * - which config an `extends` names: enhanced-resolve looks for a package in
 *   `node_modules` only, and one base config it cannot read fails every import
 *   under the config. So each entry is served as the tracked file it names
 *   (see {@link extendedConfig}).
 */
import * as path from "node:path"
import { ResolverFactory, type ResolveOptions } from "enhanced-resolve"
import * as jsonc from "jsonc-parser"

/** Reads a file's text out of the repo, or null when it cannot be read. */
export type Read = (path: string) => Promise<string | null>

/** The repository file a specifier written in `fromFile` names, or null for anything outside it. */
export type ResolveModule = (fromFile: string, specifier: string) => Promise<string | null>

/** Where the repository is mounted: enhanced-resolve works on absolute paths. */
const ROOT = "/"

/**
 * Extensions probed for a specifier that names no file directly. `.ts` before
 * `.js` because the `.js` is usually build output, not source a reader wants.
 */
export const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".d.ts", ".js", ".jsx", ".mjs", ".cjs", ".json"]

/** TypeScript's emitted-extension convention: under `nodenext` a `.ts` source is imported as `./x.js`. */
export const EMITTED = {
  ".js": [".js", ".ts", ".tsx"],
  ".mjs": [".mjs", ".mts"],
  ".cjs": [".cjs", ".cts"],
  ".jsx": [".jsx", ".tsx"],
}

/**
 * The package.json fields a bare import of a workspace package lands on, most
 * source-like first. A field counts only when it names a tracked file: `main`
 * and `exports` usually point at build output a repository does not track.
 * `exports` is read as an entry field, not as Node's exports map, so a missing
 * target falls through to the next field instead of failing.
 */
export const MAIN_FIELDS: (string | string[])[] = [
  "source",
  "exports",
  ["exports", "."],
  ["exports", ".", "types"],
  ["exports", ".", "import"],
  ["exports", ".", "require"],
  ["exports", ".", "default"],
  ["exports", "types"],
  ["exports", "import"],
  ["exports", "require"],
  ["exports", "default"],
  "types",
  "typings",
  "module",
  "main",
]

type Callback<T> = (error: NodeJS.ErrnoException | null, value?: T) => void
type Stats = { isFile: () => boolean; isDirectory: () => boolean; isSymbolicLink: () => boolean }

/**
 * "Not there", for a path enhanced-resolve probes. It probes many paths that do
 * not exist, so this is a plain object: an `Error` would capture a stack trace
 * every time, and that alone made a walk several times slower.
 */
const missing = (at: string): NodeJS.ErrnoException =>
  ({ name: "Error", code: "ENOENT", message: `ENOENT: no such file or directory, '${at}'` }) as NodeJS.ErrnoException

/** The last argument of a file-system call is its callback; an options object may come before it. */
const callbackOf = <T>(args: unknown[]): Callback<T> => args[args.length - 1] as Callback<T>

/**
 * The tracked file a tsconfig's `extends` entry names, or null when git holds
 * none.
 *
 * A relative entry is read from the config's own directory. A package entry
 * (`@acme/tsconfig/base.json`) is read from the workspace package of that
 * name, since git holds no `node_modules` to find it in. A bare package name
 * means its `tsconfig.json`. As TypeScript does, `.json` is tried when the
 * entry names no file as written.
 */
export function extendedConfig(
  entry: string,
  file: string,
  files: ReadonlySet<string>,
  packages: ReadonlyMap<string, string>,
): string | null {
  let candidate: string | null = null
  if (entry.startsWith("./") || entry.startsWith("../")) {
    candidate = path.posix.join(path.posix.dirname(file), entry)
  } else if (!entry.startsWith("/")) {
    const parts = entry.split("/")
    const width = entry.startsWith("@") ? 2 : 1
    const directory = packages.get(parts.slice(0, width).join("/"))
    if (directory !== undefined) {
      const rest = parts.slice(width).join("/")
      candidate = path.posix.join(directory, rest === "" ? "tsconfig.json" : rest)
    }
  }
  if (candidate === null) return null
  if (files.has(candidate)) return candidate
  return files.has(`${candidate}.json`) ? `${candidate}.json` : null
}

/**
 * A tsconfig's text as enhanced-resolve is served it, with two things made
 * absolute.
 *
 * - Every `paths` target, against the config that declares it: its `baseUrl`
 *   when it sets one, else its own directory.
 * - Every `extends` entry, by `extended`, to the tracked file it names.
 *   enhanced-resolve looks for an `extends` package in `node_modules` only,
 *   which git does not hold, and one base config it cannot read fails every
 *   import under the config. So an entry that names no tracked file is left
 *   out: its options are lost, and the imports still resolve.
 *
 * Text that is not a config object is returned as it is.
 */
export function rootedPaths(
  text: string,
  file: string,
  extended: (entry: string) => string | null,
  root = ROOT,
): string {
  const parsed = jsonc.parse(text) as unknown
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return text
  const config = { ...(parsed as Record<string, unknown>) }

  if (typeof config.extends === "string" || Array.isArray(config.extends)) {
    const entries = (Array.isArray(config.extends) ? config.extends : [config.extends]) as unknown[]
    const rooted = entries
      .map((entry) => (typeof entry === "string" ? extended(entry) : null))
      .filter((entry): entry is string => entry !== null)
      .map((entry) => path.posix.join(root, entry))
    if (rooted.length === 0) delete config.extends
    else config.extends = Array.isArray(config.extends) ? rooted : rooted[0]
  }

  const options = config.compilerOptions
  if (typeof options === "object" && options !== null) {
    const { baseUrl, paths } = options as { baseUrl?: unknown; paths?: unknown }
    if (typeof paths === "object" && paths !== null) {
      const base = path.posix.join(root, path.posix.dirname(file), typeof baseUrl === "string" ? baseUrl : ".")
      const rooted: Record<string, unknown> = {}
      for (const [pattern, targets] of Object.entries(paths as Record<string, unknown>)) {
        rooted[pattern] = Array.isArray(targets)
          ? targets.map((target) => (typeof target === "string" ? path.posix.join(base, target) : target))
          : targets
      }
      config.compilerOptions = { ...options, paths: rooted }
    }
  }
  return JSON.stringify(config)
}

/** The repository as a file system enhanced-resolve can read: the file set for what exists, `read` for contents. */
function repoFileSystem(
  files: ReadonlySet<string>,
  read: Read,
  packages: Promise<ReadonlyMap<string, string>>,
): NonNullable<ResolveOptions["fileSystem"]> {
  const directories = new Set<string>([""])
  for (const file of files) {
    for (let at = path.posix.dirname(file); at !== "." && !directories.has(at); at = path.posix.dirname(at)) {
      directories.add(at)
    }
  }
  const inRepo = (at: string): string => path.posix.relative(ROOT, at)
  const stats = (file: boolean): Stats => ({ isFile: () => file, isDirectory: () => !file, isSymbolicLink: () => false })
  // One buffer per file, the same object every time: enhanced-resolve keys
  // its own caches (stripped tsconfig comments) on it.
  const buffers = new Map<string, Promise<Buffer | null>>()
  const bufferOf = (relative: string): Promise<Buffer | null> => {
    let held = buffers.get(relative)
    if (held === undefined) {
      const text = /(^|\/)tsconfig[^/]*\.json$/.test(relative)
        ? Promise.all([read(relative), packages]).then(([value, found]) =>
            value === null ? null : rootedPaths(value, relative, (entry) => extendedConfig(entry, relative, files, found)),
          )
        : read(relative)
      held = text.then((value) => (value === null ? null : Buffer.from(value)))
      buffers.set(relative, held)
    }
    return held
  }
  const manifests = new Map<string, Promise<unknown>>()

  const stat = (at: string, ...args: unknown[]): void => {
    const done = callbackOf<Stats>(args)
    const relative = inRepo(at)
    if (files.has(relative)) done(null, stats(true))
    else if (directories.has(relative)) done(null, stats(false))
    else done(missing(at))
  }

  const fileSystem = {
    stat,
    lstat: stat,
    readFile: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<Buffer>(args)
      const relative = inRepo(at)
      if (!files.has(relative)) return done(missing(at))
      bufferOf(relative).then(
        (value) => (value === null ? done(missing(at)) : done(null, value)),
        (error: NodeJS.ErrnoException) => done(error),
      )
    },
    // A package.json, parsed once. (A tsconfig is read with `readFile`: it may
    // hold comments, which only enhanced-resolve's own reader strips.)
    readJson: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<unknown>(args)
      const relative = inRepo(at)
      if (!files.has(relative)) return done(missing(at))
      let held = manifests.get(relative)
      if (held === undefined) {
        held = bufferOf(relative).then((value) => (value === null ? null : (JSON.parse(value.toString("utf8")) as unknown)))
        manifests.set(relative, held)
      }
      held.then(
        (value) => (value === null ? done(missing(at)) : done(null, value)),
        (error: NodeJS.ErrnoException) => done(error),
      )
    },
    readdir: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<string[]>(args)
      const relative = inRepo(at)
      if (!directories.has(relative)) return done(missing(at))
      const prefix = relative === "" ? "" : `${relative}/`
      const names = new Set<string>()
      for (const one of [...files, ...directories]) {
        if (one === relative || !one.startsWith(prefix)) continue
        const rest = one.slice(prefix.length)
        if (!rest.includes("/")) names.add(rest)
      }
      done(null, [...names])
    },
    readlink: (at: string, ...args: unknown[]): void => {
      callbackOf<string>(args)(Object.assign(new Error(`EINVAL: not a link, '${at}'`), { code: "EINVAL" }))
    },
  }
  return fileSystem as unknown as NonNullable<ResolveOptions["fileSystem"]>
}

export type Alias = { name: string; alias: string[]; onlyModule?: boolean }

/**
 * Every tracked package.json with a name: the name, and the package's
 * directory in the repository. The first package of a name wins.
 */
export async function workspacePackages(files: ReadonlySet<string>, read: Read): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const file of files) {
    if (path.posix.basename(file) !== "package.json") continue
    const text = await read(file)
    if (text === null) continue
    const manifest = jsonc.parse(text) as unknown
    const name = typeof manifest === "object" && manifest !== null ? (manifest as { name?: unknown }).name : undefined
    // A package with no name cannot be imported by name.
    if (typeof name !== "string" || name === "" || out.has(name)) continue
    out.set(name, path.posix.dirname(file))
  }
  return out
}

/** Every workspace package, as an alias from its name to its directory. */
export function workspaceAliases(packages: ReadonlyMap<string, string>, root = ROOT): Alias[] {
  const out: Alias[] = []
  for (const [name, directory] of packages) {
    const dir = path.posix.join(root, directory)
    // The bare name tries the package's entry fields and index, then its
    // `src`, the usual home of the source a reader opens.
    out.push({ name, alias: [dir, path.posix.join(dir, "src")], onlyModule: true })
    out.push({ name, alias: [dir] })
  }
  return out
}

/** The nearest `tsconfig.json` at or above a directory, as TypeScript finds it. */
export function nearestConfig(directory: string, files: ReadonlySet<string>): string | null {
  for (let here = directory; ; here = path.posix.dirname(here)) {
    const candidate = here === "." ? "tsconfig.json" : `${here}/tsconfig.json`
    if (files.has(candidate)) return candidate
    if (here === ".") return null
  }
}

/** Resolves module specifiers against the repository `files`, reading configs with `read`. */
export function moduleResolver(files: ReadonlySet<string>, read: Read): ResolveModule {
  const packages = workspacePackages(files, read)
  const fileSystem = repoFileSystem(files, read, packages)
  const aliases = packages.then((found) => workspaceAliases(found))
  // One resolver per governing config; every file under it shares it.
  const resolvers = new Map<string, Promise<ReturnType<typeof ResolverFactory.createResolver>>>()

  const resolverFor = (config: string | null): Promise<ReturnType<typeof ResolverFactory.createResolver>> => {
    const key = config ?? ""
    let held = resolvers.get(key)
    if (held === undefined) {
      held = aliases.then((alias) =>
        ResolverFactory.createResolver({
          fileSystem,
          extensions: EXTENSIONS,
          extensionAlias: EMITTED,
          mainFields: MAIN_FIELDS,
          exportsFields: [],
          mainFiles: ["index"],
          conditionNames: [],
          symlinks: false,
          // The files do not change during a walk, so an answer can be kept.
          unsafeCache: true,
          alias,
          tsconfig: config === null ? false : { configFile: path.posix.join(ROOT, config) },
        }),
      )
      resolvers.set(key, held)
    }
    return held
  }

  return async (fromFile, specifier) => {
    if (specifier === "") return null
    const directory = path.posix.dirname(fromFile)
    const resolver = await resolverFor(nearestConfig(directory, files))
    return new Promise((settle) => {
      resolver.resolve({}, path.posix.join(ROOT, directory), specifier, {}, (error, found) => {
        settle(error || typeof found !== "string" ? null : path.posix.relative(ROOT, found))
      })
    })
  }
}
