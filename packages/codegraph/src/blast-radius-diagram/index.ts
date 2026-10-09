import type { ImportGraphFile } from "@/import-graph"
import type { Blast } from "@flightplan/configurations"

export const generateBlastRadiusDiagram = (importGraph: readonly ImportGraphFile[]): Blast => ({
  nodes: importGraph.map(({ filePath, diffType }) => ({ path: filePath, diffType, impactType: null, impactReason: null })),
  edges: importGraph.flatMap(({ filePath, importsTo }) =>
    importsTo.filter((imported) => imported !== filePath).map((imported) => ({ importer: filePath, imported }))),
})
