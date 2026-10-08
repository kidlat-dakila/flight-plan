import { connectedTo, levelsAbove } from "@/diagram/reach"
import type { ConnectionCertainty, JourneyEdge, JourneyFlow, JourneyNode } from "@flightplan/configurations"

export interface DiagramSettings {
  readonly levels: number | null
  readonly isShowingData: boolean
  readonly isShowingAssumed: boolean
}

interface FilterableEdge {
  readonly kind: string
  readonly certainty: ConnectionCertainty
}

export const isEdgeShown = (edge: FilterableEdge, settings: DiagramSettings): boolean =>
  (edge.kind !== "data" || settings.isShowingData) && (edge.certainty !== "assumed" || settings.isShowingAssumed)

const isHead = (node: JourneyNode): boolean => node.kind === "declaration" && node.changeType === "diff"

const headIdsOf = (flow: JourneyFlow): string[] => flow.nodes.filter(isHead).map((node) => node.id)

export const tailLevelsOf = (flow: JourneyFlow, edges: readonly JourneyEdge[]): ReadonlyMap<string, number> =>
  levelsAbove(edges, headIdsOf(flow))

const isWithinLevels = (level: number | undefined, settings: DiagramSettings): boolean =>
  level === undefined || settings.levels === null || level <= settings.levels

const keptDeclarationIds = (flow: JourneyFlow, edges: readonly JourneyEdge[], settings: DiagramSettings): Set<string> => {
  const connected = connectedTo(edges, headIdsOf(flow))
  const levels = tailLevelsOf(flow, edges)
  return new Set(
    flow.nodes
      .filter((node) => node.kind === "declaration" && connected.has(node.id))
      .filter((node) => isHead(node) || isWithinLevels(levels.get(node.id), settings))
      .map((node) => node.id),
  )
}

const hasKeptHandler = (node: JourneyNode, edges: readonly JourneyEdge[], keptIds: ReadonlySet<string>): boolean =>
  edges.some((edge) => edge.from === node.id && keptIds.has(edge.to))

export const filterJourney = (flow: JourneyFlow, settings: DiagramSettings): JourneyFlow => {
  const shownEdges = flow.edges.filter((edge) => isEdgeShown(edge, settings))
  const declarationIds = keptDeclarationIds(flow, shownEdges, settings)
  const nodes = flow.nodes.filter((node) =>
    node.kind === "entry-point" ? hasKeptHandler(node, shownEdges, declarationIds) : declarationIds.has(node.id))
  const keptIds = new Set(nodes.map((node) => node.id))
  return {
    ...flow,
    nodes,
    edges: shownEdges.filter((edge) => keptIds.has(edge.from) && keptIds.has(edge.to)),
  }
}
