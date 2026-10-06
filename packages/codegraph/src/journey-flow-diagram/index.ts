import { mergeDiagramNodes, type DiagramNode, type UsageGraph, type UsageGraphNode } from "@/ast-graph"
import type { DeclarationNode, EntryPointNode, JourneyEdge, JourneyFlow, NodeCategory } from "@flightplan/configurations"

const DEFAULT_CATEGORY: NodeCategory = "logic"
const FLOW_ID_PREFIX = "journey:"
const ENTRY_POINT_ID_PREFIX = "entry:"
const LISTED_NAME_LIMIT = 3
const NAME_SEPARATOR = ", "

const entryPointIdOf = (handlerId: string): string => `${ENTRY_POINT_ID_PREFIX}${handlerId}`

const toDeclarationNode = ({ id, path, declaration, isChanged }: UsageGraphNode): DeclarationNode => ({
  kind: "declaration",
  id,
  path,
  declaration,
  isChanged,
  category: DEFAULT_CATEGORY,
  label: null,
  description: null,
})

const toEntryPointNode = ({ id, declaration }: UsageGraphNode): EntryPointNode => ({
  kind: "entry-point",
  id: entryPointIdOf(id),
  label: declaration,
  description: null,
})

const toTriggerEdge = ({ id }: UsageGraphNode): JourneyEdge => ({ from: entryPointIdOf(id), to: id, kind: "trigger", certainty: "proven" })

const listHandlers = ({ nodes, edges }: UsageGraph): UsageGraphNode[] => {
  const usedIds = new Set(edges.map((edge) => edge.to))
  return nodes.filter((node) => !usedIds.has(node.id))
}

const listedNames = (names: readonly string[]): string =>
  names.length <= LISTED_NAME_LIMIT
    ? names.join(NAME_SEPARATOR)
    : `${names.slice(0, LISTED_NAME_LIMIT).join(NAME_SEPARATOR)} +${String(names.length - LISTED_NAME_LIMIT)} more`

export const generateJourneyFlowDiagram = (segmentDiagramNodes: readonly DiagramNode[]): JourneyFlow | null => {
  const graph = mergeDiagramNodes(segmentDiagramNodes)
  const changed = graph.nodes.filter((node) => node.isChanged)
  if (changed.length === 0) return null
  const handlers = listHandlers(graph)
  return {
    id: `${FLOW_ID_PREFIX}${changed[0].id}`,
    title: listedNames(changed.map((node) => node.declaration)),
    nodes: [...handlers.map(toEntryPointNode), ...graph.nodes.map(toDeclarationNode)],
    edges: [...handlers.map(toTriggerEdge), ...graph.edges.map((edge) => ({ ...edge, certainty: "proven" as const }))],
  }
}
