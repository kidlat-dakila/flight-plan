import { codeLinkIdOf } from "@/procedures/get-review/utils/code/links"
import type { ReviewViewContext } from "@/procedures/get-review/utils/context"
import { countLabel } from "@/procedures/get-review/utils/count-label"
import { buildDiagramConfiguration, EDGE_LEGEND } from "@/procedures/get-review/utils/diagram/configuration"
import { parseProse } from "@/procedures/get-review/utils/parse-prose"
import type { JourneyEdge, JourneyFlow, NodeCategory, Segment } from "@/procedures/get-review/utils/review-artifact"
import type { JourneyBand, JourneyEdgeView, JourneyNodeView } from "@/procedures/get-review/utils/schemas"
import { filterJourney, tailLevelsOf, type DiagramSettings } from "./filter"
import { hasEdgeLabel, layoutJourney, type PlacedEdge, type PlacedNode } from "./layout"

const JOURNEY_ANCHOR_NAME = "journey-flow-diagram"

const CATEGORY_LABELS: Readonly<Record<NodeCategory, string>> = {
  guard: "Guard",
  logic: "Logic",
  data: "Data",
  type: "Type",
  ui: "UI",
  config: "Config",
}

const EDGE_KIND_LABELS: Readonly<Record<JourneyEdge["kind"], string | null>> = {
  trigger: null,
  call: null,
  value: "value",
  data: "data",
}

const ASSUMED_LABEL = "assumed"
const LABEL_SEPARATOR = ", "

const knownLinkId = (context: ReviewViewContext, path: string, declaration: string): string | null => {
  const linkId = codeLinkIdOf(path, declaration)
  return context.knownLinkIds.has(linkId) ? linkId : null
}

const toNodeView = ({ node, ...box }: PlacedNode, context: ReviewViewContext): JourneyNodeView => {
  const description = node.description === null ? null : parseProse(node.description, context.knownLinkIds)
  return node.kind === "entry-point"
    ? {
        ...box,
        id: node.id,
        kind: "entry-point",
        category: null,
        kindLabel: "Entry point",
        changedLabel: null,
        label: node.label,
        isDraft: false,
        sublabel: null,
        description,
        codeLinkId: null,
      }
    : {
        ...box,
        id: node.id,
        kind: node.isChanged ? "head" : "tail",
        category: node.category,
        kindLabel: CATEGORY_LABELS[node.category],
        changedLabel: node.isChanged ? "Changed" : null,
        label: node.label ?? node.declaration,
        isDraft: node.label === null,
        sublabel: node.path,
        description,
        codeLinkId: knownLinkId(context, node.path, node.declaration),
      }
}

const edgeLabelText = (edge: JourneyEdge): string =>
  [EDGE_KIND_LABELS[edge.kind], edge.certainty === "assumed" ? ASSUMED_LABEL : null]
    .filter((part) => part !== null)
    .join(LABEL_SEPARATOR)

const toEdgeView = ({ edge, points, labelPoint }: PlacedEdge): JourneyEdgeView => ({
  id: `${edge.from}>${edge.to}:${edge.kind}`,
  kind: edge.kind,
  isAssumed: edge.certainty === "assumed",
  points: [...points],
  label: hasEdgeLabel(edge) ? { text: edgeLabelText(edge), ...labelPoint } : null,
})

const nodeSummaryLabel = (shownCount: number, totalCount: number): string =>
  shownCount === totalCount
    ? countLabel(totalCount, "node", "nodes")
    : `${String(shownCount)} of ${countLabel(totalCount, "node", "nodes")}`

const toDiagram = (flow: JourneyFlow, scope: string, settings: DiagramSettings, context: ReviewViewContext): NonNullable<JourneyBand["diagram"]> => {
  const filtered = filterJourney(flow, settings)
  const layout = layoutJourney(filtered)
  return {
    anchorId: `${scope}journey-${flow.id}`,
    title: flow.title,
    summaryLabel: nodeSummaryLabel(filtered.nodes.length, flow.nodes.length),
    width: layout.width,
    height: layout.height,
    nodes: layout.nodes.map((placed) => toNodeView(placed, context)),
    edges: layout.edges.map(toEdgeView),
  }
}

const deepestTailLevel = (flow: JourneyFlow): number =>
  Math.max(0, ...flow.nodes
    .filter((node) => node.kind === "declaration")
    .map((node) => tailLevelsOf(flow, flow.edges).get(node.id) ?? 0))

const levelLabels = (flow: JourneyFlow): string[] =>
  Array.from({ length: deepestTailLevel(flow) }, (_unused, level) => (level === 0 ? "None" : String(level)))

export const buildJourney = (
  segment: Segment,
  scope: string,
  settings: DiagramSettings,
  context: ReviewViewContext,
): JourneyBand => ({
  anchorId: `${scope}${JOURNEY_ANCHOR_NAME}`,
  heading: "Journey Flow Diagram",
  absence: segment.journeyAbsence === null ? null : parseProse(segment.journeyAbsence, context.knownLinkIds),
  configuration: segment.journey === null
    ? null
    : buildDiagramConfiguration(
        "Journey Flow Diagram configuration",
        { label: "Tail Node levels", allLabel: "All", levelLabels: levelLabels(segment.journey) },
        segment.journey.edges,
        settings,
      ),
  legend: EDGE_LEGEND,
  diagram: segment.journey === null ? null : toDiagram(segment.journey, scope, settings, context),
})
