import { firstOfEach } from "@/shared/first-of-each"
import type { DiagramNode, UsageKind } from "./diagram-node"

export interface UsageGraphNode {
  readonly id: string
  readonly path: string
  readonly declaration: string
  readonly isChanged: boolean
}

export interface UsageGraphEdge {
  readonly from: string
  readonly to: string
  readonly kind: UsageKind
}

export interface UsageGraph {
  readonly nodes: readonly UsageGraphNode[]
  readonly edges: readonly UsageGraphEdge[]
}

const ID_SEPARATOR = "#"
const EDGE_SEPARATOR = ">"
const DEFAULT_KIND: UsageKind = "call"

export const usageNodeIdOf = (filePath: string, name: string): string => [filePath, name].join(ID_SEPARATOR)

const idOf = ({ code }: DiagramNode): string => usageNodeIdOf(code.file, code.name)

const listNodes = (node: DiagramNode): DiagramNode[] => [node, ...node.callers.flatMap(listNodes)]

const listEdges = (node: DiagramNode): UsageGraphEdge[] =>
  node.callers.flatMap((caller) => [{ from: idOf(caller), to: idOf(node), kind: caller.via ?? DEFAULT_KIND }, ...listEdges(caller)])

export const mergeDiagramNodes = (diagramNodes: readonly DiagramNode[]): UsageGraph => {
  const changedIds = new Set(diagramNodes.map(idOf))
  const nodes = firstOfEach(diagramNodes.flatMap(listNodes), idOf).map((node) => ({
    id: idOf(node),
    path: node.code.file,
    declaration: node.code.name,
    isChanged: changedIds.has(idOf(node)),
  }))
  const edges = firstOfEach(diagramNodes.flatMap(listEdges), ({ from, to }) => [from, to].join(EDGE_SEPARATOR))
  return { nodes, edges: edges.filter(({ from, to }) => from !== to) }
}

const listUsersOf = (edges: readonly UsageGraphEdge[], ids: readonly string[]): string[] => [
  ...new Set(edges.filter((edge) => ids.includes(edge.to)).map((edge) => edge.from)),
]

const expandRings = (edges: readonly UsageGraphEdge[], frontier: readonly string[], rings: ReadonlyMap<string, number>, ring: number): ReadonlyMap<string, number> => {
  const next = listUsersOf(edges, frontier).filter((id) => !rings.has(id))
  if (next.length === 0) return rings
  return expandRings(edges, next, new Map([...rings, ...next.map((id) => [id, ring] as const)]), ring + 1)
}

const CHANGED_RING = 0

export const ringsOf = ({ nodes, edges }: UsageGraph): ReadonlyMap<string, number> => {
  const changedIds = nodes.filter((node) => node.isChanged).map((node) => node.id)
  return expandRings(edges, changedIds, new Map(changedIds.map((id) => [id, CHANGED_RING] as const)), CHANGED_RING + 1)
}
