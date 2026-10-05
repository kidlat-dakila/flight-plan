import * as path from "node:path"
import { cruise, type ICruiseResult } from "dependency-cruiser"
import { groupBy } from "@/core/group-by"
import { iterateUntil } from "@/core/iterate"
import { mapInSequence } from "@/core/sequence"
import { mountVirtual } from "@/core/virtual-fs"
import { count } from "@/core/walk-stats"
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

export interface Edge {
  specifier: string
  to: string | null
  typeOnly: boolean
  dynamic: boolean
  reexport: boolean
}

export interface RepoGraph {
  imports: ReadonlyMap<string, readonly Edge[]>
  importers: ReadonlyMap<string, readonly string[]>
  unhandled: ReadonlyMap<string, readonly string[]>
}

export interface GraphSource {
  files: ReadonlySet<string>
  read: Read
  readAll?: (paths: readonly string[]) => Promise<ReadonlyMap<string, string>>
}

const SOURCE = /\.(?:[cm]?[jt]s|[jt]sx)$/i
const JSON_FILE = /\.json$/i
const TSCONFIG = /(^|\/)tsconfig[^/]*\.json$/

class MountCounter {
  private mounted = 0

  public readonly next = (): number => {
    this.mounted += 1
    return this.mounted
  }
}

const mounts = new MountCounter()

const escape = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const folderOf = (config: string | null): string =>
  config === null || path.posix.dirname(config) === "." ? "" : `${path.posix.dirname(config)}/`

const isCruiseResult = (value: unknown): value is ICruiseResult =>
  typeof value === "object" && value !== null && "modules" in value && Array.isArray(value.modules)

const edgesOf = (module: ICruiseResult["modules"][number]): Edge[] =>
  module.dependencies.map((dependency) => ({
    specifier: dependency.module,
    to: dependency.couldNotResolve || dependency.coreModule || dependency.resolved.split("/").includes("node_modules") ? null : dependency.resolved,
    typeOnly: dependency.typeOnly === true,
    dynamic: dependency.dynamic,
    reexport: dependency.dependencyTypes.includes("export"),
  }))

interface CruiseScope {
  root: string
  alias: ReturnType<typeof workspaceAliases>
  folders: readonly string[]
}

async function importsOfGroup(config: string | null, group: readonly string[], { root, alias, folders }: CruiseScope): Promise<[string, Edge[]][]> {
  const folder = folderOf(config)
  const nested = folders.filter((one) => one !== folder && one.startsWith(folder))
  const doNotFollow = [
    "node_modules",
    ...(folder === "" ? [] : [`^(?!${escape(folder)})`]),
    ...(nested.length === 0 ? [] : [`^(${nested.map(escape).join("|")})`]),
  ].join("|")
  const result = await cruise(
    [...group],
    { baseDir: root, outputType: "json", tsPreCompilationDeps: true, parser: "tsc", doNotFollow: { path: doNotFollow } },
    {
      alias,
      extensions: EXTENSIONS,
      extensionAlias: EMITTED,
      mainFields: MAIN_FIELDS,
      mainFiles: ["index"],
      symlinks: false,
      ...(config === null ? {} : { tsconfig: { configFile: path.posix.join(root, config) } }),
    },
  )
  const output: unknown = typeof result.output === "string" ? JSON.parse(result.output) : result.output
  if (!isCruiseResult(output)) return []
  const own = new Set(group)
  return output.modules.filter((module) => own.has(module.source)).map((module) => [module.source, edgesOf(module)])
}

function importersOf(imports: ReadonlyMap<string, readonly Edge[]>): Map<string, string[]> {
  const uses = [...imports].flatMap(([from, edges]) => edges.flatMap((edge) => (edge.to === null ? [] : [{ to: edge.to, from }])))
  return new Map([...groupBy(uses, (use) => use.to)].map(([to, group]) => [to, [...new Set(group.map((use) => use.from))]]))
}

export async function repoGraph(source: GraphSource): Promise<RepoGraph> {
  const began = performance.now()
  const root = `/__flightplan__/graph-${String(mounts.next())}`
  const sources = [...source.files].filter((file) => SOURCE.test(file) && !file.split("/").includes("node_modules")).sort()
  const loaded = [...source.files].filter((file) => SOURCE.test(file) || JSON_FILE.test(file))

  const texts = source.readAll ? await source.readAll(loaded) : await readEach(loaded, source.read)
  const packages = await workspacePackages(source.files, source.read)
  const served = (text: string, file: string): string =>
    rootedPaths(text, file, (entry) => extendedConfig(entry, file, source.files, packages), root)
  const contents = new Map([...texts].map(([file, text]) => [file, Buffer.from(TSCONFIG.test(file) ? served(text, file) : text)]))
  const alias = workspaceAliases(packages, root)

  const groups = groupBy(sources, (file) => nearestConfig(path.posix.dirname(file), source.files))
  const scope = { root, alias, folders: [...groups.keys()].map(folderOf) }

  const mounted = mountVirtual(root, { names: source.files, contents })
  const cruised = await mapInSequence([...groups], async ([config, group]) => importsOfGroup(config, group, scope)).finally(() => {
    mounted.unmount()
  })
  const imports = new Map(cruised.flat())

  count("graphMs", performance.now() - began)
  count("graphFiles", imports.size)
  return { imports, importers: importersOf(imports), unhandled: mounted.unhandled }
}

async function readEach(files: readonly string[], read: Read): Promise<Map<string, string>> {
  const texts = await mapInSequence(files, async (file) => ({ file, text: await read(file) }))
  return new Map(texts.flatMap(({ file, text }): [string, string][] => (text === null ? [] : [[file, text]])))
}

export function graphResolver(
  graph: RepoGraph,
  fallback: (fromFile: string, specifier: string) => Promise<string | null>,
): (fromFile: string, specifier: string) => Promise<string | null> {
  const byFile = new Map(
    [...graph.imports].map(([from, edges]) => [from, new Map([...edges].reverse().map((edge) => [edge.specifier, edge.to]))]),
  )
  return async (fromFile, specifier) => {
    if (specifier.startsWith("node:")) return null
    const to = byFile.get(fromFile)?.get(specifier)
    if (to !== undefined) return to
    count("graphMisses")
    return fallback(fromFile, specifier)
  }
}

interface Spread { queue: readonly string[], out: ReadonlySet<string>, reached: ReadonlySet<string> }

export function graphCandidates(graph: RepoGraph, file: string): string[] {
  const spreadFrom = ({ queue, out, reached }: Spread): Spread => {
    const [next, ...rest] = queue
    const importers = graph.importers.get(next) ?? []
    const passing = importers.filter(
      (importer) => !reached.has(importer) && (graph.imports.get(importer) ?? []).some((edge) => edge.reexport && edge.to === next),
    )
    return { queue: [...rest, ...passing], out: new Set([...out, ...importers]), reached: new Set([...reached, ...passing]) }
  }
  const spread = iterateUntil<Spread>(
    { queue: [file], out: new Set([file]), reached: new Set([file]) },
    (one) => one.queue.length === 0,
    spreadFrom,
  )
  return [...spread.out].sort()
}
