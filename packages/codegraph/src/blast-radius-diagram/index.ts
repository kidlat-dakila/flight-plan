import { mergeDiagramNodes, ringsOf, type DiagramNode, type UsageGraphNode } from "@/ast-graph"
import type { Blast, BlastNode } from "@flightplan/configurations"

const EPICENTER_RING = 0

const toBlastNode = ({ id, path, declaration }: UsageGraphNode, ring: number): BlastNode => ({
  id,
  ring,
  path,
  declaration,
  label: null,
  contract: null,
  verdict: null,
  effect: null,
})

export const generateBlastRadiusDiagram = (segmentDiagramNodes: readonly DiagramNode[]): Blast => {
  const graph = mergeDiagramNodes(segmentDiagramNodes)
  const rings = ringsOf(graph)
  const nodes = graph.nodes.map((node) => toBlastNode(node, rings.get(node.id) ?? EPICENTER_RING))
  return {
    nodes: [...nodes].sort((one, two) => one.ring - two.ring),
    edges: graph.edges.map((edge) => ({ ...edge, certainty: "proven" as const })),
  }
}
