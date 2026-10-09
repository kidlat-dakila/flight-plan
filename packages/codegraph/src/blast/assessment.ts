import type { Blast, BlastNode } from "@flightplan/configurations"

export const isChangedFile = (node: BlastNode): boolean => node.diffType !== null

const isStop = (node: BlastNode): boolean => !isChangedFile(node) && node.impactType === "unaffected"

const expandReach = (blast: Blast, stopPaths: ReadonlySet<string>, frontier: readonly string[], reached: ReadonlySet<string>): ReadonlySet<string> => {
  const carriers = new Set(frontier.filter((path) => !stopPaths.has(path)))
  const importers = blast.edges.filter((edge) => carriers.has(edge.imported)).map((edge) => edge.importer)
  const next = [...new Set(importers)].filter((path) => !reached.has(path))
  return next.length === 0 ? reached : expandReach(blast, stopPaths, next, new Set([...reached, ...next]))
}

export const listReachedPaths = (blast: Blast): ReadonlySet<string> => {
  const changedPaths = blast.nodes.filter(isChangedFile).map((node) => node.path)
  const stopPaths = new Set(blast.nodes.filter(isStop).map((node) => node.path))
  const reached = expandReach(blast, stopPaths, changedPaths, new Set(changedPaths))
  return new Set([...reached].filter((path) => !changedPaths.includes(path)))
}

export const listUnassessedNodes = (blast: Blast): BlastNode[] => {
  const reachedPaths = listReachedPaths(blast)
  return blast.nodes.filter((node) => reachedPaths.has(node.path) && node.impactType === null)
}

export const listCarriedImports = (blast: Blast, path: string): string[] => {
  const reachedPaths = listReachedPaths(blast)
  const carrierPaths = new Set(blast.nodes.filter((node) => isChangedFile(node) || (reachedPaths.has(node.path) && node.impactType !== "unaffected")).map((node) => node.path))
  return blast.edges.filter((edge) => edge.importer === path && carrierPaths.has(edge.imported)).map((edge) => edge.imported)
}
