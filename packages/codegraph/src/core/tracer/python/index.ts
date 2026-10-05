import { groupBy } from "@/core/group-by"
import type { ImportEdge, ImportGraph, Importer } from "@/core/tracer/import-tree"
import { withTree, type TreeCache } from "@/core/tracer/parse"
import { importBindingsOf } from "./imports"
import type { PyPackages } from "./module-roots"
import { resolveModule } from "./resolve"

export interface PyRepo {
  files: ReadonlySet<string>
  read: (path: string) => Promise<string | null>
  rootsFor: (fromFile: string) => Promise<string[]>
  packages?: PyPackages
  trees?: TreeCache
}

export function pythonImportGraph(
  repo: PyRepo,
  candidates: (file: string) => Promise<string[]>,
): ImportGraph {
  const importsOf = async (file: string): Promise<Importer[]> => {
    const text = await repo.read(file)
    if (text === null) return []
    const bindings = await withTree(file, text, importBindingsOf, null)
    if (bindings === null) return []
    const roots = await repo.rootsFor(file)

    const imported = bindings.flatMap((binding): { path: string, edge: ImportEdge }[] => {
      const resolved = resolveModule(file, binding.module, binding.level, binding.imported, repo.files, roots, repo.packages ?? null)
      return resolved.kind === "file" ? [{ path: resolved.path, edge: { kind: binding.typeOnly ? "type" : "static", line: binding.line } }] : []
    })

    return [...groupBy(imported, (one) => one.path)].map(([path, group]) => ({
      path,
      edges: [...group.map((one) => one.edge)].sort((one, two) => one.line - two.line),
    }))
  }

  return { importsOf, candidates }
}
