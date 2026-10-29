import { groupBy } from "@/shared/group-by"
import { walkBreadthFirst } from "@/shared/reach"
import type { Blast, BlastNode } from "@flightplan/configurations"

export const isChangedFile = (node: BlastNode): boolean => node.diffType !== null

const isStop = (node: BlastNode): boolean => !isChangedFile(node) && node.impactType === "unaffected"

const expandReach = (blastDiagram: Blast, stopPaths: ReadonlySet<string>, startPaths: readonly string[]): ReadonlySet<string> => {
  const edgesByImported = groupBy(blastDiagram.edges, (edge) => edge.imported)
  const importersOf = (path: string): string[] => (stopPaths.has(path) ? [] : (edgesByImported.get(path) ?? []).map((edge) => edge.importer))
  return new Set(walkBreadthFirst(startPaths, { nextOf: importersOf, keyOf: (path) => path }))
}

export const listReachedPaths = (blastDiagram: Blast): ReadonlySet<string> => {
  const changedPaths = blastDiagram.nodes.filter(isChangedFile).map((node) => node.path)
  const stopPaths = new Set(blastDiagram.nodes.filter(isStop).map((node) => node.path))
  const reached = expandReach(blastDiagram, stopPaths, changedPaths)
  return new Set([...reached].filter((path) => !changedPaths.includes(path)))
}

export const listUnassessedNodes = (blastDiagram: Blast): BlastNode[] => {
  const reachedPaths = listReachedPaths(blastDiagram)
  return blastDiagram.nodes.filter((node) => reachedPaths.has(node.path) && node.impactType === null)
}

export const listCarriedImports = (blastDiagram: Blast, path: string): string[] => {
  const reachedPaths = listReachedPaths(blastDiagram)
  const carrierPaths = new Set(blastDiagram.nodes.filter((node) => isChangedFile(node) || (reachedPaths.has(node.path) && node.impactType !== "unaffected")).map((node) => node.path))
  return blastDiagram.edges.filter((edge) => edge.importer === path && carrierPaths.has(edge.imported)).map((edge) => edge.imported)
}
