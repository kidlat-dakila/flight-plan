import type { DiffType, ImportGraphContext, ImportTracer } from "./import-graph-context"
import { importLanguageOf } from "./languages"
import { sortedPaths } from "./sorted-paths"

export interface ImportGraphFile {
  readonly filePath: string
  readonly gitSha: string
  readonly diffType: DiffType | null
  readonly importedBy: readonly string[]
  readonly importsTo: readonly string[]
}

type Neighbours = (filePath: string) => Promise<readonly string[]>

const reach = async (
  pending: readonly string[],
  neighboursOf: Neighbours,
  reached: ReadonlySet<string> = new Set(),
): Promise<ReadonlySet<string>> => {
  const unvisited = [...new Set(pending)].filter((filePath) => !reached.has(filePath))
  if (unvisited.length === 0) return reached
  const neighbours = await Promise.all(unvisited.map(neighboursOf))
  return await reach(neighbours.flat(), neighboursOf, new Set([...reached, ...unvisited]))
}

const readTracedImports = async (
  traced: readonly string[],
  tracer: ImportTracer,
): Promise<ReadonlyMap<string, readonly string[]>> => {
  const kept = new Set(traced)
  const imports = await Promise.all(
    traced.map(async (filePath) => {
      const imported = await tracer.importsOf(filePath)
      return [filePath, imported.filter((one) => kept.has(one))] as const
    }),
  )
  return new Map(imports)
}

const importersIn = (imports: ReadonlyMap<string, readonly string[]>, filePath: string): string[] =>
  [...imports].filter(([, imported]) => imported.includes(filePath)).map(([importer]) => importer)

export const traceImportGraph = async (context: ImportGraphContext, filePath: string): Promise<ImportGraphFile[]> => {
  const language = importLanguageOf(filePath)
  if (language === null) return []
  const commit = context.diffTypes.get(filePath) === "deleted" ? context.baseCommit : context.headCommit
  const tracer = await context.tracerFor(commit, language)
  if (!tracer.files.has(filePath)) return []

  const [importers, imported] = await Promise.all([
    reach([filePath], tracer.importersOf),
    reach([filePath], tracer.importsOf),
  ])
  const traced = sortedPaths([...importers, ...imported])
  const imports = await readTracedImports(traced, tracer)

  return traced.map((tracedPath) => ({
    filePath: tracedPath,
    gitSha: context.diffTypes.get(tracedPath) === "deleted" ? context.baseCommit : context.headCommit,
    diffType: context.diffTypes.get(tracedPath) ?? null,
    importedBy: importersIn(imports, tracedPath),
    importsTo: imports.get(tracedPath) ?? [],
  }))
}
