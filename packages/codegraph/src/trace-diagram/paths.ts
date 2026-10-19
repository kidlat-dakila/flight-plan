import type { TraceDiagram } from "@flightplan/configurations"
import { listTraceNodes } from "."

const ARROW = " → "

export const listTracePaths = ({ traceNodes, traceNodeEdges }: TraceDiagram): string[] => {
  const nodeIds = listTraceNodes(traceNodes).map((node) => node.id)
  const arrivedAtIds = new Set(traceNodeEdges.map((edge) => edge.to))
  const pathsFrom = (nodeId: string, walkedIds: readonly string[]): string[] => {
    const nextIds = traceNodeEdges.filter((edge) => edge.from === nodeId && !walkedIds.includes(edge.to)).map((edge) => edge.to)
    if (nextIds.length === 0) return [nodeId]
    return nextIds.flatMap((nextId) => pathsFrom(nextId, [...walkedIds, nodeId]).map((path) => [nodeId, path].join(ARROW)))
  }
  return nodeIds.filter((nodeId) => !arrivedAtIds.has(nodeId)).flatMap((nodeId) => pathsFrom(nodeId, []))
}
