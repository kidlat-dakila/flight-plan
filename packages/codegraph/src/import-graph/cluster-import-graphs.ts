import { groupBy } from "@/core/group-by"
import { sortedByPath, sortedPaths } from "./sorted-paths"
import type { ImportGraphFile } from "./trace-import-graph"

type ImportGraph = readonly ImportGraphFile[]

const mergeFiles = (sameFile: readonly ImportGraphFile[]): ImportGraphFile => ({
  ...sameFile[0],
  importedBy: sortedPaths(sameFile.flatMap((file) => file.importedBy)),
  importsTo: sortedPaths(sameFile.flatMap((file) => file.importsTo)),
  importedFilePaths: new Map(sameFile.flatMap((file) => [...file.importedFilePaths])),
})

const mergeImportGraphs = (importGraphs: readonly ImportGraph[]): ImportGraphFile[] => {
  const filesByPath = groupBy(importGraphs.flat(), (file) => file.filePath)
  return sortedByPath([...filesByPath.values()].map(mergeFiles), (file) => file.filePath)
}

const addImportGraph = (clusters: readonly ImportGraph[], importGraph: ImportGraph): readonly ImportGraph[] => {
  if (importGraph.length === 0) return clusters
  const filePaths = new Set(importGraph.map((file) => file.filePath))
  const isConnected = (cluster: ImportGraph): boolean => cluster.some((file) => filePaths.has(file.filePath))
  const connected = clusters.filter(isConnected)
  const separate = clusters.filter((cluster) => !isConnected(cluster))
  return [...separate, mergeImportGraphs([...connected, importGraph])]
}

export const clusterImportGraphs = (importGraphs: readonly ImportGraph[]): ImportGraphFile[][] => {
  const clusters = importGraphs.reduce(addImportGraph, []).map((cluster) => [...cluster])
  return sortedByPath(clusters, (cluster) => cluster[0].filePath)
}
