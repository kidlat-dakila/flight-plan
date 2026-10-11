import type { JourneyFlowDiagram } from "@flightplan/configurations"
import { listJourneyNodes } from "."

const ARROW = " → "

export const listJourneyPaths = ({ journeyNodes, journeyNodeEdges }: JourneyFlowDiagram): string[] => {
  const nodeIds = listJourneyNodes(journeyNodes).map((node) => node.id)
  const arrivedAtIds = new Set(journeyNodeEdges.map((edge) => edge.to))
  const pathsFrom = (nodeId: string, walkedIds: readonly string[]): string[] => {
    const nextIds = journeyNodeEdges.filter((edge) => edge.from === nodeId && !walkedIds.includes(edge.to)).map((edge) => edge.to)
    if (nextIds.length === 0) return [nodeId]
    return nextIds.flatMap((nextId) => pathsFrom(nextId, [...walkedIds, nodeId]).map((path) => [nodeId, path].join(ARROW)))
  }
  return nodeIds.filter((nodeId) => !arrivedAtIds.has(nodeId)).flatMap((nodeId) => pathsFrom(nodeId, []))
}
