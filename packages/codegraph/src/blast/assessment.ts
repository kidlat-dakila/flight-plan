import type { Blast, BlastNode } from "@flightplan/configurations"

export const isChangedFile = (node: BlastNode): boolean => node.diffType !== null

const isStop = (node: BlastNode): boolean => !isChangedFile(node) && node.impactType === "unaffected"

const expandReach = (blastDiagram: Blast, stopPaths: ReadonlySet<string>, frontier: readonly string[], reached: ReadonlySet<string>): ReadonlySet<string> => {
  const carriers = new Set(frontier.filter((path) => !stopPaths.has(path)))
  const importers = blastDiagram.edges.filter((edge) => carriers.has(edge.imported)).map((edge) => edge.importer)
  const next = [...new Set(importers)].filter((path) => !reached.has(path))
  return next.length === 0 ? reached : expandReach(blastDiagram, stopPaths, next, new Set([...reached, ...next]))
}

export const listReachedPaths = (blastDiagram: Blast): ReadonlySet<string> => {
  const changedPaths = blastDiagram.nodes.filter(isChangedFile).map((node) => node.path)
  const stopPaths = new Set(blastDiagram.nodes.filter(isStop).map((node) => node.path))
  const reached = expandReach(blastDiagram, stopPaths, changedPaths, new Set(changedPaths))
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
