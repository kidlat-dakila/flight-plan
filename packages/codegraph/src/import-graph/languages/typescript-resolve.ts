import * as path from "node:path"
import enhancedResolve, { type ResolveOptions } from "enhanced-resolve"
import * as jsonc from "jsonc-parser"
import { fitsGlob } from "@/catalogue/matching/file-patterns"
import { Memo } from "@/shared/memo"
import { omit, recordOf } from "@/shared/record"
import { mapInSequence } from "@/shared/sequence"

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
type ModuleResolver = ReturnType<typeof enhancedResolve.ResolverFactory.createResolver>
interface Stats { isFile: () => boolean, isDirectory: () => boolean, isSymbolicLink: () => boolean }

const SCOPED_NAME_PARTS = 2
const TSCONFIG = /(^|\/)(tsconfig|jsconfig)[^/]*\.json$/
const CONFIG_NAMES = ["tsconfig.json", "jsconfig.json"]
const PACKAGE_FOLDER = "node_modules"
const SCOPE_PREFIX = "@"
const CONDITIONS = ["source", "types", "import", "require", "default"]
const EVERY_FILE = "**/*"
const WILDCARD = "*"
const CURRENT_FOLDER = "."

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

const inPackageFolder = (relative: string): string | null =>
  relative.startsWith(`${PACKAGE_FOLDER}/`) ? relative.slice(PACKAGE_FOLDER.length + 1) : null

export function installedPathOf(relative: string, packages: ReadonlyMap<string, string>): string | null {
  const inside = inPackageFolder(relative)
  const name = inside === null ? undefined : [...packages.keys()].find((one) => inside === one || inside.startsWith(`${one}/`))
  const directory = name === undefined ? undefined : packages.get(name)
  if (inside === null || name === undefined || directory === undefined) return null
  const found = path.posix.join(directory, inside.slice(name.length))
  return found === CURRENT_FOLDER ? "" : found
}

export function installedNamesIn(relative: string, packages: ReadonlyMap<string, string>): string[] | null {
  const names = [...packages.keys()]
  if (relative === PACKAGE_FOLDER) return [...new Set(names.map((name) => name.split("/")[0]))]
  const scope = inPackageFolder(relative)
  if (scope === null || !scope.startsWith(SCOPE_PREFIX) || scope.includes("/")) return null
  const scoped = names.filter((name) => name.startsWith(`${scope}/`)).map((name) => name.slice(scope.length + 1))
  return scoped.length === 0 ? null : scoped
}

function repoFileSystem(
  files: ReadonlySet<string>,
  read: Read,
  packages: Promise<ReadonlyMap<string, string>>,
): ResolverFileSystem {
  const directories = new Set<string>(["", ...[...files].flatMap(ancestorsOf)])
  const inRepo = (at: string): string => path.posix.relative(ROOT, at)
  const realPathOf = async (at: string): Promise<string> => {
    const relative = inRepo(at)
    return installedPathOf(relative, await packages) ?? relative
  }
  const installedNamesAt = async (at: string): Promise<string[] | null> => installedNamesIn(inRepo(at), await packages)
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
    Promise.all([realPathOf(at), installedNamesAt(at)]).then(([relative, installed]) => {
      if (installed !== null) done(null, stats(false))
      else if (files.has(relative)) done(null, stats(true))
      else if (directories.has(relative)) done(null, stats(false))
      else done(missing(at))
    }, failWith(done))
  }

  const fileSystem = {
    stat,
    lstat: stat,
    readFile: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<Buffer>(args)
      realPathOf(at).then(async (relative) => (files.has(relative) ? await bufferOf(relative) : null)).then((value) => {
        deliver(done, at, value)
      }, failWith(done))
    },
    readJson: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<unknown>(args)
      realPathOf(at).then(async (relative) => (files.has(relative) ? await manifestOf(relative) : null)).then((value) => {
        deliver(done, at, value)
      }, failWith(done))
    },
    readdir: (at: string, ...args: unknown[]): void => {
      const done = callbackOf<string[]>(args)
      Promise.all([realPathOf(at), installedNamesAt(at)]).then(([relative, installed]) => {
        if (installed !== null) {
          done(null, installed)
          return
        }
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
      }, failWith(done))
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

const configIn = (directory: string, files: ReadonlySet<string>): string | undefined =>
  CONFIG_NAMES.map((name) => (directory === CURRENT_FOLDER ? name : `${directory}/${name}`)).find((candidate) => files.has(candidate))

export function nearestConfig(directory: string, files: ReadonlySet<string>): string | null {
  for (let here = directory; ; here = path.posix.dirname(here)) {
    const found = configIn(here, files)
    if (found !== undefined) return found
    if (here === CURRENT_FOLDER) return null
  }
}

export interface ConfigScope {
  readonly files: readonly string[] | null
  readonly include: readonly string[] | null
  readonly exclude: readonly string[] | null
}

const NO_SCOPE: ConfigScope = { files: null, include: null, exclude: null }

const stringsOf = (value: unknown): string[] | null =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : null

const globOf = (folder: string, pattern: string): string => {
  const joined = path.posix.join(folder, pattern)
  const last = path.posix.basename(joined)
  return last.includes(WILDCARD) || path.posix.extname(last) !== "" ? joined : `${joined}/${EVERY_FILE}`
}

const ownScopeOf = (config: Record<string, unknown>, file: string): ConfigScope => {
  const folder = path.posix.dirname(file)
  const rooted = (patterns: readonly string[] | null, rootPattern: (pattern: string) => string) => (patterns === null ? null : patterns.map(rootPattern))
  return {
    files: rooted(stringsOf(config.files), (entry) => path.posix.join(folder, entry)),
    include: rooted(stringsOf(config.include), (pattern) => globOf(folder, pattern)),
    exclude: rooted(stringsOf(config.exclude), (pattern) => globOf(folder, pattern)),
  }
}

const inherited = (own: ConfigScope, extended: ConfigScope): ConfigScope => ({
  files: own.files ?? extended.files,
  include: own.include ?? extended.include,
  exclude: own.exclude ?? extended.exclude,
})

export function coversFile({ files, include, exclude }: ConfigScope, configFile: string, file: string): boolean {
  if (files?.includes(file) === true) return true
  const patterns = include ?? (files === null ? [globOf(path.posix.dirname(configFile), EVERY_FILE)] : [])
  return patterns.some((glob) => fitsGlob(glob, file)) && !(exclude ?? []).some((glob) => fitsGlob(glob, file))
}

const referencedConfigOf = (entry: unknown, file: string, files: ReadonlySet<string>): string | null => {
  const reference = recordOf(entry)?.path
  if (typeof reference !== "string") return null
  const target = path.posix.join(path.posix.dirname(file), reference)
  if (files.has(target)) return target
  return configIn(target, files) ?? null
}

interface ConfigReader {
  readonly recordOf: (file: string) => Promise<Record<string, unknown> | null>
  readonly scopeOf: (file: string) => Promise<ConfigScope>
}

const createConfigReader = (files: ReadonlySet<string>, read: Read, packages: Promise<ReadonlyMap<string, string>>): ConfigReader => {
  const records = new Memo<string, Promise<Record<string, unknown> | null>>()
  const scopes = new Memo<string, Promise<ConfigScope>>()
  const configRecordOf = async (file: string): Promise<Record<string, unknown> | null> =>
    await records.remember(file, async () => {
      const text = await read(file)
      return text === null ? null : recordOf(jsonc.parse(text))
    })
  const scopeOf = async (file: string, seen: ReadonlySet<string> = new Set()): Promise<ConfigScope> =>
    await scopes.remember(file, async () => {
      const config = await configRecordOf(file)
      if (config === null) return NO_SCOPE
      const entry = config.extends
      const extendedFile = typeof entry === "string" ? extendedConfig(entry, file, files, await packages) : null
      const own = ownScopeOf(config, file)
      if (extendedFile === null || seen.has(extendedFile)) return own
      return inherited(own, await scopeOf(extendedFile, new Set([...seen, file])))
    })
  return { recordOf: configRecordOf, scopeOf }
}

const findCoveringConfig = async (
  configFile: string,
  file: string,
  reader: ConfigReader,
  files: ReadonlySet<string>,
  seen: ReadonlySet<string>,
): Promise<string | null> => {
  if (seen.has(configFile)) return null
  if (coversFile(await reader.scopeOf(configFile), configFile, file)) return configFile
  const references = (await reader.recordOf(configFile))?.references
  const referenced = (Array.isArray(references) ? references : []).flatMap((entry) => {
    const found = referencedConfigOf(entry, configFile, files)
    return found === null ? [] : [found]
  })
  const covering = await mapInSequence(referenced, async (one) => await findCoveringConfig(one, file, reader, files, new Set([...seen, configFile])))
  return covering.find((one) => one !== null) ?? null
}

export function moduleResolver(files: ReadonlySet<string>, read: Read): ResolveModule {
  const packages = workspacePackages(files, read)
  const fileSystem = repoFileSystem(files, read, packages)
  const aliases = packages.then((found) => workspaceAliases(found))
  const resolvers = new Memo<string, Promise<ModuleResolver>>()
  const configReader = createConfigReader(files, read, packages)
  const projectConfigs = new Memo<string, Promise<string | null>>()
  const projectConfigFor = async (file: string): Promise<string | null> =>
    await projectConfigs.remember(file, async () => {
      const nearest = nearestConfig(path.posix.dirname(file), files)
      return nearest === null ? null : ((await findCoveringConfig(nearest, file, configReader, files, new Set())) ?? nearest)
    })
  const repoPathOf = async (found: string): Promise<string> => {
    const relative = path.posix.relative(ROOT, found)
    return installedPathOf(relative, await packages) ?? relative
  }

  const resolverFor = async (config: string | null): Promise<ModuleResolver> =>
    resolvers.remember(config ?? "", async () =>
      aliases.then((alias) =>
        enhancedResolve.ResolverFactory.createResolver({
          fileSystem,
          extensions: EXTENSIONS,
          extensionAlias: EMITTED,
          mainFields: MAIN_FIELDS,
          exportsFields: ["exports"],
          mainFiles: ["index"],
          conditionNames: CONDITIONS,
          symlinks: false,
          unsafeCache: true,
          fallback: alias,
          tsconfig: config === null ? false : { configFile: path.posix.join(ROOT, config) },
        }),
      ),
    )

  return async (fromFile, specifier) => {
    if (specifier === "") return null
    const directory = path.posix.dirname(fromFile)
    const resolver = await resolverFor(await projectConfigFor(fromFile))
    const found = await new Promise<string | null>((settle) => {
      resolver.resolve({}, path.posix.join(ROOT, directory), specifier, {}, (error, resolved) => {
        settle(error || typeof resolved !== "string" ? null : resolved)
      })
    })
    return found === null ? null : await repoPathOf(found)
  }
}
