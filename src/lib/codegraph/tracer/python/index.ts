/**
 * The Python import graph.
 *
 * The Python analogue of `tracer/typescript/index.ts`'s `typescriptImportGraph`:
 * read a file, find every import binding it writes (`imports.ts`'s
 * `importBindingsOf`), and resolve each to an in-tree file via `resolve.ts`'s
 * `resolveModule`. Resolution needs the roots a file sees and the workspace's
 * distribution→source-dir map, both supplied by the repo (`rootsFor`,
 * `packages`) rather than decided here — finding them is `moduleRoots.ts`'s
 * concern.
 */
import { withTree, type TreeCache } from "../parse"
import { importBindingsOf } from "./imports"
import { resolveModule } from "./resolve"
import type { PyPackages } from "./moduleRoots"
import type { ImportEdge, ImportGraph, Importer } from "../importTree"

/** Where the bytes come from, and the roots and packages each file resolves against. */
export type PyRepo = {
  files: ReadonlySet<string>
  read: (path: string) => Promise<string | null>
  /** The import roots a file resolves absolute imports against. Found elsewhere (`moduleRoots.ts`). */
  rootsFor: (fromFile: string) => Promise<string[]>
  /**
   * The workspace's distribution→source-dir map, for a module whose first
   * segment names another workspace package. Built elsewhere and optional — a
   * single-package repo has none.
   */
  packages?: PyPackages
  /** One walk's parsed trees; see `RepoBase`. */
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

    // One entry per imported file, carrying every edge that reaches it.
    const byPath = new Map<string, ImportEdge[]>()
    for (const binding of bindings) {
      const resolved = resolveModule(
        file,
        binding.module,
        binding.level,
        binding.imported,
        repo.files,
        roots,
        repo.packages ?? null,
      )
      if (resolved.kind !== "file") continue
      const edges = byPath.get(resolved.path) ?? []
      edges.push({ kind: binding.typeOnly ? "type" : "static", line: binding.line })
      byPath.set(resolved.path, edges)
    }

    return [...byPath].map(([path, edges]) => ({
      path,
      edges: edges.sort((one, two) => one.line - two.line),
    }))
  }

  return { importsOf, candidates }
}
