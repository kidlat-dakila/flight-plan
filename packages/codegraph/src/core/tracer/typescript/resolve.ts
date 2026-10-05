import * as path from "node:path"
import { ResolverFactory, type ResolveOptions } from "enhanced-resolve"
import * as jsonc from "jsonc-parser"
import { Memo } from "@/core/memo"
import { omit, recordOf } from "@/core/record"
import { mapInSequence } from "@/core/sequence"

export type Read = (path: string) => Promise<string | null>

export type ResolveModule = (fromFile: string, specifier: string) => Promise<string | null>

const ROOT = "/"

export const EXTENSIONS = [".ts", ".tsx", ".mts", ".cts", ".d.ts", ".js", ".jsx", ".mjs", ".cjs", ".json"]

export const EMITTED = {
  ".js": [".js", ".ts", ".tsx"],
  ".mjs": [".mjs", ".mts"],
  ".cjs": [".cjs", ".cts"],
  ".jsx": [".jsx", ".tsx"],
}

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

type Callback<Value> = (error: NodeJS.ErrnoException | null, value?: Value) => void
type ResolverFileSystem = NonNullable<ResolveOptions["fileSystem"]>
type ModuleResolver = ReturnType<typeof ResolverFactory.createResolver>
interface Stats { isFile: () => boolean, isDirectory: () => boolean, isSymbolicLink: () => boolean }

const SCOPED_NAME_PARTS = 2
const TSCONFIG = /(^|\/)tsconfig[^/]*\.json$/

const missing = (at: string): NodeJS.ErrnoException =>
  ({ name: "Error", code: "ENOENT", message: `ENOENT: no such file or directory, '${at}'` })

const isCallback = <Value>(value: unknown): value is Callback<Value> => typeof value === "function"

const callbackOf = <Value>(args: readonly unknown[]): Callback<Value> => {
  const last = args[args.length - 1]
  if (!isCallback<Value>(last)) throw new TypeError("A file system call needs a callback as its last argument")
  return last
}

const deliver = <Value>(done: Callback<Value>, at: string, value: Value | null): void => {
  if (value === null) done(missing(at))
  else done(null, value)
}

const failWith = <Value>(done: Callback<Value>) => (error: unknown): void => {
  done(error instanceof Error ? error : new Error(String(error)))
}

function configCandidate(entry: string, file: string, packages: ReadonlyMap<string, string>): string | null {
  if (entry.startsWith("./") || entry.startsWith("../")) return path.posix.join(path.posix.dirname(file), entry)
  if (entry.startsWith("/")) return null
  const parts = entry.split("/")
  const width = entry.startsWith("@") ? SCOPED_NAME_PARTS : 1
  const directory = packages.get(parts.slice(0, width).join("/"))
  if (directory === undefined) return null
  const rest = parts.slice(width).join("/")
  return path.posix.join(directory, rest === "" ? "tsconfig.json" : rest)
}

export function extendedConfig(
  entry: string,
  file: string,
  files: ReadonlySet<string>,
  packages: ReadonlyMap<string, string>,
): string | null {
  const candidate = configCandidate(entry, file, packages)
  if (candidate === null) return null
  if (files.has(candidate)) return candidate
  return files.has(`${candidate}.json`) ? `${candidate}.json` : null
}

function withRootedExtends(config: Record<string, unknown>, extended: (entry: string) => string | null, root: string): Record<string, unknown> {
  const entry = config.extends
  if (typeof entry !== "string" && !Array.isArray(entry)) return config
  const entries: unknown[] = Array.isArray(entry) ? entry : [entry]
  const rooted = entries.flatMap((one) => {
    const found = typeof one === "string" ? extended(one) : null
    return found === null ? [] : [path.posix.join(root, found)]
  })
  if (rooted.length === 0) return omit(config, "extends")
  return { ...config, extends: Array.isArray(entry) ? rooted : rooted[0] }
}

const rootedTarget = (base: string, target: unknown): unknown => (typeof target === "string" ? path.posix.join(base, target) : target)

function withRootedPaths(config: Record<string, unknown>, file: string, root: string): Record<string, unknown> {
  const options = recordOf(config.compilerOptions)
  const paths = options === null ? null : recordOf(options.paths)
  if (options === null || paths === null) return config
  const base = path.posix.join(root, path.posix.dirname(file), typeof options.baseUrl === "string" ? options.baseUrl : ".")
  const rooted = Object.fromEntries(
    Object.entries(paths).map(([pattern, targets]) => [
      pattern,
      Array.isArray(targets) ? targets.map((target: unknown) => rootedTarget(base, target)) : targets,
    ]),
  )
  return { ...config, compilerOptions: { ...options, paths: rooted } }
}

export function rootedPaths(
  text: string,
  file: string,
  extended: (entry: string) => string | null,
  root = ROOT,
): string {
  const parsed: unknown = jsonc.parse(text)
  const config = recordOf(parsed)
  return config === null ? text : JSON.stringify(withRootedPaths(withRootedExtends(config, extended, root), file, root))
}

const ancestorsOf = (at: string): string[] => {
  const above = path.posix.dirname(at)
  return above === "." ? [] : [above, ...ancestorsOf(above)]
}

const isResolverFileSystem = (fileSystem: object): fileSystem is ResolverFileSystem =>
  ["stat", "lstat", "readFile", "readJson", "readdir", "readlink"].every((method) => method in fileSystem)

function repoFileSystem(
  files: ReadonlySet<string>,
  read: Read,
  packages: Promise<ReadonlyMap<string, string>>,
): ResolverFileSystem {
  const directories = new Set<string>(["", ...[...files].flatMap(ancestorsOf)])
  const inRepo = (at: string): string => path.posix.relative(ROOT, at)
  const stats = (isFile: boolean): Stats => ({ isFile: () => isFile, isDirectory: () => !isFile, isSymbolicLink: () => false })
  const buffers = new Memo<string, Promise<Buffer | null>>()
  const textOf = async (relative: string): Promise<string | null> => {
    if (!TSCONFIG.test(relative)) return read(relative)
    const [value, found] = await Promise.all([read(relative), packages])
    return value === null ? null : rootedPaths(value, relative, (entry) => extendedConfig(entry, relative, files, found))
  }
  const bufferOf = async (relative: string): Promise<Buffer | null> =>
    buffers.remember(relative, async () => textOf(relative).then((value) => (value === null ? null : Buffer.from(value))))
  const manifests = new Memo<string, Promise<unknown>>()
  const manifestOf = async (relative: string): Promise<unknown> =>
    manifests.remember(relative, async () =>
      bufferOf(relative).then((value): unknown => (value === null ? null : JSON.parse(value.toString("utf8")))),
    )

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
      if (!files.has(relative)) {
        done(missing(at))
        return
      }
      bufferOf(relative).then((value) => {
        deliver(done, at, value)
      }, failWith(done))
    },
    readJson: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<unknown>(args)
      const relative = inRepo(at)
      if (!files.has(relative)) {
        done(missing(at))
        return
      }
      manifestOf(relative).then((value) => {
        deliver(done, at, value)
      }, failWith(done))
    },
    readdir: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<string[]>(args)
      const relative = inRepo(at)
      if (!directories.has(relative)) {
        done(missing(at))
        return
      }
      const prefix = relative === "" ? "" : `${relative}/`
      const names = [...files, ...directories]
        .filter((one) => one !== relative && one.startsWith(prefix))
        .map((one) => one.slice(prefix.length))
        .filter((rest) => !rest.includes("/"))
      done(null, [...new Set(names)])
    },
    readlink: (at: string, ...args: unknown[]): void => {
      callbackOf<string>(args)(Object.assign(new Error(`EINVAL: not a link, '${at}'`), { code: "EINVAL" }))
    },
  }
  if (!isResolverFileSystem(fileSystem)) throw new TypeError("The repository file system is missing a resolver method")
  return fileSystem
}

export interface Alias { name: string, alias: string[], onlyModule?: boolean }

const packageNameOf = (text: string): string | null => {
  const manifest: unknown = jsonc.parse(text)
  const name = recordOf(manifest)?.name
  return typeof name === "string" && name !== "" ? name : null
}

export async function workspacePackages(files: ReadonlySet<string>, read: Read): Promise<Map<string, string>> {
  const manifests = [...files].filter((file) => path.posix.basename(file) === "package.json")
  const named = await mapInSequence(manifests, async (file) => {
    const text = await read(file)
    return { file, name: text === null ? null : packageNameOf(text) }
  })
  return named.reduce<Map<string, string>>(
    (held, { file, name }) => (name === null || held.has(name) ? held : new Map(held).set(name, path.posix.dirname(file))),
    new Map(),
  )
}

export function workspaceAliases(packages: ReadonlyMap<string, string>, root = ROOT): Alias[] {
  return [...packages].flatMap(([name, directory]) => {
    const dir = path.posix.join(root, directory)
    return [{ name, alias: [dir, path.posix.join(dir, "src")], onlyModule: true }, { name, alias: [dir] }]
  })
}

export function nearestConfig(directory: string, files: ReadonlySet<string>): string | null {
  for (let here = directory; ; here = path.posix.dirname(here)) {
    const candidate = here === "." ? "tsconfig.json" : `${here}/tsconfig.json`
    if (files.has(candidate)) return candidate
    if (here === ".") return null
  }
}

export function moduleResolver(files: ReadonlySet<string>, read: Read): ResolveModule {
  const packages = workspacePackages(files, read)
  const fileSystem = repoFileSystem(files, read, packages)
  const aliases = packages.then((found) => workspaceAliases(found))
  const resolvers = new Memo<string, Promise<ModuleResolver>>()

  const resolverFor = async (config: string | null): Promise<ModuleResolver> =>
    resolvers.remember(config ?? "", async () =>
      aliases.then((alias) =>
        ResolverFactory.createResolver({
          fileSystem,
          extensions: EXTENSIONS,
          extensionAlias: EMITTED,
          mainFields: MAIN_FIELDS,
          exportsFields: [],
          mainFiles: ["index"],
          conditionNames: [],
          symlinks: false,
          unsafeCache: true,
          alias,
          tsconfig: config === null ? false : { configFile: path.posix.join(ROOT, config) },
        }),
      ),
    )

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
