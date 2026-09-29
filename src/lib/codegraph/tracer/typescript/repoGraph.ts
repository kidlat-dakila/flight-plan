/**
 * The TypeScript / JavaScript import graph of one commit, built once per walk.
 *
 * dependency-cruiser reads every TS/JS file and resolves every import in it,
 * once. The walk then asks the graph instead of resolving the same imports
 * again for every target (`imports`), and asks it who imports a file instead
 * of searching the repository for a word (`importers`).
 *
 * dependency-cruiser reads the disk only, so the commit is served to it from
 * git objects through {@link mountVirtual}, under a root of its own. It
 * resolves with this tracer's own settings (`resolve.ts`): workspace packages
 * as aliases, the emitted-`.js` convention, package entry fields, and every
 * tsconfig served with its `paths` and `extends` made absolute.
 *
 * One tsconfig governs one cruise, where TypeScript takes the nearest
 * `tsconfig.json` of each file. So the files are grouped by nearest config
 * and each group is cruised with its own; a group's cruise stops at files
 * outside the group, which its own group reads. dependency-cruiser's
 * `dependents` then only know one group, so `importers` is the inverse of
 * every group's `imports`.
 */
import { cruise, type ICruiseResult } from "dependency-cruiser"
import * as path from "node:path"
import { mountVirtual } from "../../../git/virtualFs"
import { count } from "../../walkStats"
import {
  EMITTED,
  EXTENSIONS,
  extendedConfig,
  MAIN_FIELDS,
  nearestConfig,
  rootedPaths,
  workspaceAliases,
  workspacePackages,
  type Read,
} from "./resolve"

/** One import written in a file. */
export type Edge = {
  /** The module specifier as written. */
  specifier: string
  /** The repository file it names, or null for a package, a Node module, or nothing. */
  to: string | null
  typeOnly: boolean
  dynamic: boolean
  /** An `export … from`: the file passes the imported file's names on (a barrel). */
  reexport: boolean
}

export type RepoGraph = {
  /** Every TS/JS file of the commit, with the imports it writes. */
  imports: ReadonlyMap<string, readonly Edge[]>
  /** Every file imported by another, with the files that import it. */
  importers: ReadonlyMap<string, readonly string[]>
  /** File-system calls dependency-cruiser made that the virtual root did not serve; empty when all is well. */
  unhandled: ReadonlyMap<string, readonly string[]>
}

/** What the graph is built from: the file set, and a reader, batched when the source can. */
export type GraphSource = {
  files: ReadonlySet<string>
  read: Read
  readAll?: (paths: readonly string[]) => Promise<ReadonlyMap<string, string>>
}

/** The files the tracer reads: its own extensions, outside any `node_modules`. */
const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/i
/** Files dependency-cruiser may read beyond sources: manifests and configs. */
const JSON_FILE = /\.json$/i
const TSCONFIG = /(^|\/)tsconfig[^/]*\.json$/

let mounts = 0

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export async function repoGraph(source: GraphSource): Promise<RepoGraph> {
  const began = performance.now()
  const root = `/__flightplan__/graph-${String(++mounts)}`
  const sources = [...source.files].filter((file) => SOURCE.test(file) && !file.split("/").includes("node_modules")).sort()
  const loaded = [...source.files].filter((file) => SOURCE.test(file) || JSON_FILE.test(file))

  const texts = source.readAll ? await source.readAll(loaded) : await readEach(loaded, source.read)
  const packages = await workspacePackages(source.files, source.read)
  const served = (text: string, file: string): string =>
    rootedPaths(text, file, (entry) => extendedConfig(entry, file, source.files, packages), root)
  const contents = new Map<string, Buffer>()
  for (const [file, text] of texts) contents.set(file, Buffer.from(TSCONFIG.test(file) ? served(text, file) : text))
  const alias = workspaceAliases(packages, root)

  // Files grouped by the tsconfig that governs them (null: none does).
  const groups = new Map<string | null, string[]>()
  for (const file of sources) {
    const config = nearestConfig(path.posix.dirname(file), source.files)
    const group = groups.get(config)
    if (group === undefined) groups.set(config, [file])
    else group.push(file)
  }
  const folderOf = (config: string | null): string =>
    config === null || path.posix.dirname(config) === "." ? "" : `${path.posix.dirname(config)}/`

  const imports = new Map<string, Edge[]>()
  const mounted = mountVirtual(root, { names: source.files, contents })
  try {
    for (const [config, group] of groups) {
      const folder = folderOf(config)
      // Stop at files another group reads: outside this group's folder, or in a
      // nested group's folder.
      const nested = [...groups.keys()].map(folderOf).filter((one) => one !== folder && one.startsWith(folder))
      const doNotFollow = [
        "node_modules",
        ...(folder === "" ? [] : [`^(?!${escape(folder)})`]),
        ...(nested.length === 0 ? [] : [`^(${nested.map(escape).join("|")})`]),
      ].join("|")
      const result = await cruise(
        group,
        { baseDir: root, outputType: "json", tsPreCompilationDeps: true, parser: "tsc", doNotFollow: { path: doNotFollow } },
        {
          alias,
          extensions: EXTENSIONS,
          extensionAlias: EMITTED,
          mainFields: MAIN_FIELDS,
          mainFiles: ["index"],
          symlinks: false,
          ...(config === null ? {} : { tsconfig: { configFile: path.posix.join(root, config) } }),
        } as Parameters<typeof cruise>[2],
      )
      const output = (typeof result.output === "string" ? JSON.parse(result.output) : result.output) as ICruiseResult
      const own = new Set(group)
      for (const module of output.modules) {
        if (!own.has(module.source)) continue
        imports.set(
          module.source,
          module.dependencies.map((dependency) => ({
            specifier: dependency.module,
            to: dependency.couldNotResolve || dependency.coreModule || dependency.resolved.split("/").includes("node_modules") ? null : dependency.resolved,
            typeOnly: dependency.typeOnly === true,
            dynamic: dependency.dynamic,
            reexport: dependency.dependencyTypes.includes("export"),
          })),
        )
      }
    }
  } finally {
    mounted.unmount()
  }

  const importers = new Map<string, string[]>()
  for (const [from, edges] of imports) {
    for (const edge of edges) {
      if (edge.to === null) continue
      const list = importers.get(edge.to)
      if (list === undefined) importers.set(edge.to, [from])
      else if (!list.includes(from)) list.push(from)
    }
  }

  count("graphMs", performance.now() - began)
  count("graphFiles", imports.size)
  return { imports, importers, unhandled: mounted.unhandled }
}

async function readEach(files: readonly string[], read: Read): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  for (const file of files) {
    const text = await read(file)
    if (text !== null) out.set(file, text)
  }
  return out
}

/**
 * `Repo.resolve` from the graph: the file an import names, looked up. An import
 * the graph does not hold (one written in a way dependency-cruiser does not
 * read) is resolved by `fallback` instead, and counted.
 */
export function graphResolver(
  graph: RepoGraph,
  fallback: (fromFile: string, specifier: string) => Promise<string | null>,
): (fromFile: string, specifier: string) => Promise<string | null> {
  const byFile = new Map<string, Map<string, string | null>>()
  for (const [from, edges] of graph.imports) {
    const bySpecifier = new Map<string, string | null>()
    for (const edge of edges) if (!bySpecifier.has(edge.specifier)) bySpecifier.set(edge.specifier, edge.to)
    byFile.set(from, bySpecifier)
  }
  return async (fromFile, specifier) => {
    // dependency-cruiser records a Node module without its `node:` prefix; it
    // is never a repository file.
    if (specifier.startsWith("node:")) return null
    const to = byFile.get(fromFile)?.get(specifier)
    if (to !== undefined) return to
    count("graphMisses")
    return fallback(fromFile, specifier)
  }
}

/**
 * The files that may call a declaration of `file`: the file itself, every file
 * that imports it, and, through each barrel that re-exports it (`export … from`),
 * every file that imports the barrel. Which of them really use the declaration
 * is still proved by name (`localNamesFor`), as before; this replaces only the
 * word search that found them. Sorted, as `git grep` lists them.
 */
export function graphCandidates(graph: RepoGraph, file: string): string[] {
  const out = new Set<string>([file])
  const reached = new Set<string>([file])
  const queue = [file]
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const importer of graph.importers.get(next) ?? []) {
      out.add(importer)
      if (reached.has(importer)) continue
      const passesOn = (graph.imports.get(importer) ?? []).some((edge) => edge.reexport && edge.to === next)
      if (!passesOn) continue
      reached.add(importer)
      queue.push(importer)
    }
  }
  return [...out].sort()
}
