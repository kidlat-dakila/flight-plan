import { connectedTo } from "@/procedures/get-review/utils/diagram/reach"
import { isEdgeShown, type DiagramSettings } from "@/procedures/get-review/utils/journey/filter"
import type { Blast, BlastNode } from "@/procedures/get-review/utils/review-artifact"

const EPICENTER_RING = 0

export const isEpicenter = (node: BlastNode): boolean => node.ring === EPICENTER_RING

const isWithinRings = (node: BlastNode, settings: DiagramSettings): boolean =>
  settings.levels === null || node.ring <= settings.levels

export const filterBlast = (blast: Blast, settings: DiagramSettings): Blast => {
  const ringIds = new Set(blast.nodes.filter((node) => isWithinRings(node, settings)).map((node) => node.id))
  const shownEdges = blast.edges
    .filter((edge) => isEdgeShown(edge, settings))
    .filter((edge) => ringIds.has(edge.from) && ringIds.has(edge.to))
  const connected = connectedTo(shownEdges, blast.nodes.filter(isEpicenter).map((node) => node.id))
  return {
    nodes: blast.nodes.filter((node) => isEpicenter(node) || connected.has(node.id)),
    edges: shownEdges.filter((edge) => connected.has(edge.from) && connected.has(edge.to)),
  }
}

const shieldOf = (blast: Blast, node: BlastNode, shields: ReadonlyMap<string, BlastNode>): BlastNode | null => {
  const dependencies = blast.edges
    .filter((edge) => edge.from === node.id)
    .map((edge) => blast.nodes.find((candidate) => candidate.id === edge.to))
    .filter((dependency) => dependency !== undefined)
  const dependencyShields = dependencies.map((dependency) =>
    dependency.verdict === "unaffected" ? dependency : shields.get(dependency.id) ?? null)
  return isEpicenter(node) || dependencyShields.includes(null)
    ? null
    : dependencyShields.find((shield) => shield !== null) ?? null
}

export const deriveShields = (blast: Blast): ReadonlyMap<string, BlastNode> =>
  [...blast.nodes]
    .sort((first, second) => first.ring - second.ring)
    .reduce<ReadonlyMap<string, BlastNode>>((shields, node) => {
      const shield = shieldOf(blast, node, shields)
      return shield === null ? shields : new Map([...shields, [node.id, shield]])
    }, new Map())
