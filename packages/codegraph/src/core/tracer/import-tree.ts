export interface ImportEdge {
  kind: "static" | "dynamic" | "require" | "type"
  line: number
}

export interface Importer { path: string, edges: ImportEdge[] }

export interface ImporterNode {
  file: string
  edges: ImportEdge[]
  importedBy: ImporterNode[]
  cycle?: true
}

export interface ImportGraph {
  importsOf: (file: string) => Promise<Importer[]>
  candidates: (file: string) => Promise<string[]>
}

async function importersOf(graph: ImportGraph, file: string): Promise<Importer[]> {
  const candidates = await graph.candidates(file)
  const importers = await Promise.all(
    candidates
      .filter((candidate) => candidate !== file)
      .map(async (candidate): Promise<Importer> => ({
        path: candidate,
        edges: (await graph.importsOf(candidate)).filter((one) => one.path === file).flatMap((one) => one.edges),
      })),
  )
  return importers.filter((importer) => importer.edges.length > 0).sort((one, two) => one.path.localeCompare(two.path))
}

export async function traceImporters(
  graph: ImportGraph,
  target: string,
): Promise<ImporterNode> {
  const climb = async (file: string, chain: ReadonlySet<string>): Promise<ImporterNode> => {
    const importers = await importersOf(graph, file)
    const importedBy = await Promise.all(
      importers.map(async (importer): Promise<ImporterNode> => {
        if (chain.has(importer.path)) return { file: importer.path, edges: importer.edges, importedBy: [], cycle: true }
        const above = await climb(importer.path, new Set(chain).add(importer.path))
        return { ...above, edges: importer.edges }
      }),
    )
    return { file, edges: [], importedBy }
  }

  return climb(target, new Set([target]))
}
