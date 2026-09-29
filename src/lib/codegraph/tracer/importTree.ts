/**
 * Who imports a file, and every import chain above it.
 *
 * The generic climb. Given a {@link ImportGraph} — a way to ask "which files
 * import X" and "what does X import" — this builds an **inverted tree** rooted
 * at the target file, its `importedBy` nesting upward to the entry points
 * (files nobody imports). It is the file-level counterpart of the
 * declaration-level caller climb, and knows nothing about any language:
 * everything grammar-specific lives behind the graph.
 */

/** How one file imports another. */
export type ImportEdge = {
  /**
   * The syntax that made the edge.
   *
   * `static` is an `import`/`export … from` statement (a barrel is one of
   * these); `dynamic` is `import("…")`; `require` is `require("…")`; `type` is
   * a wholly type-only `import type`/`export type`, kept so a consumer can
   * exclude what never runs.
   */
  kind: "static" | "dynamic" | "require" | "type"
  /** The 1-based line the import is written on, in the importing file. */
  line: number
}

/** One file that imports another, with every edge between them. */
export type Importer = { path: string; edges: ImportEdge[] }

/** A node in the importer tree: a file and the files that import it. */
export type ImporterNode = {
  /** The file this node is. */
  file: string
  /**
   * How this file imports the node below it (toward the target). Empty on the
   * root, which is the target itself and imports nothing on the way down.
   */
  edges: ImportEdge[]
  /** The files that import this one, nested upward. Empty at an entry point. */
  importedBy: ImporterNode[]
  /**
   * Set when this file already sits on the chain below it — an import cycle.
   * `importedBy` is left empty so the climb terminates.
   */
  cycle?: true
}

/** The language-specific seam the climb runs on. */
export type ImportGraph = {
  /** The in-tree files a file imports, each with its edges. */
  importsOf: (file: string) => Promise<Importer[]>
  /** A loose over-set of files that might import a file, to be verified. */
  candidates: (file: string) => Promise<string[]>
}

/**
 * The files that import one file, verified.
 *
 * Every candidate is resolved for real through `graph.importsOf`; a candidate
 * is kept only when one of its imports lands back on `file`. A file that
 * imports itself is not its own importer.
 */
async function importersOf(graph: ImportGraph, file: string): Promise<Importer[]> {
  const candidates = await graph.candidates(file)
  const found: Importer[] = []
  for (const candidate of candidates) {
    if (candidate === file) continue
    const edges = (await graph.importsOf(candidate))
      .filter((one) => one.path === file)
      .flatMap((one) => one.edges)
    if (edges.length > 0) found.push({ path: candidate, edges })
  }
  return found.sort((one, two) => one.path.localeCompare(two.path))
}

export async function traceImporters(
  graph: ImportGraph,
  target: string,
): Promise<ImporterNode> {
  /*
   * `chain` is the files from the target up to the one being climbed. A
   * candidate already on it is an import cycle: recorded with `cycle` and not
   * followed, which is what makes the climb terminate. A file reached by two
   * different chains (a diamond) is climbed once per chain and so appears in
   * each subtree — the tree is a reach, not a deduplicated graph.
   */
  const climb = async (file: string, chain: ReadonlySet<string>): Promise<ImporterNode> => {
    const importedBy: ImporterNode[] = []
    for (const importer of await importersOf(graph, file)) {
      if (chain.has(importer.path)) {
        importedBy.push({
          file: importer.path,
          edges: importer.edges,
          importedBy: [],
          cycle: true,
        })
        continue
      }
      const above = await climb(importer.path, new Set(chain).add(importer.path))
      importedBy.push({ ...above, edges: importer.edges })
    }
    return { file, edges: [], importedBy }
  }

  return climb(target, new Set([target]))
}
