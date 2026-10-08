import { tracedLineTokenKeyOf } from "@/code/highlight-review"
import { codeLinkIdOf, rangeLabelOf } from "@/code/links"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type {
  CodeLine,
  CodeLink,
  CodeToken,
  DeclarationNode,
  TracedLine,
  UiCardView,
  UiFrameView,
  UiTriggerView,
  JourneyBand,
  JourneyEdgeView,
  JourneyFlow,
  JourneyNodeView,
  NodeCategory,
  NodeChange,
  Segment,
} from "@flightplan/configurations"
import { edgeLabelOf } from "./edge-label"
import { filterJourney, type DiagramSettings } from "./filter"
import { layoutJourney, type JourneyLayout, type PlacedCard, type PlacedEdge, type PlacedNode } from "./layout"
import type { FrameLayout, TriggerLayout } from "./ui-cards"

const JOURNEY_ANCHOR_NAME = "journey-flow-diagram"

const CATEGORY_LABELS: Readonly<Record<NodeCategory, string>> = {
  guard: "Guard",
  logic: "Logic",
  data: "Data",
  type: "Type",
  ui: "UI",
  event: "Event",
  config: "Config",
}

const ENTRY_POINT_LABEL = "Entry point"
const CHANGE_LABELS: Readonly<Record<NodeChange, string>> = { added: "Added", modified: "Modified" }
const TRACED_HEADING = "Traced lines"
const UI_CARD_LABEL = "UI"

const knownLinkId = (context: ReviewViewContext, path: string, declaration: string): string | null => {
  const linkId = codeLinkIdOf(path, declaration)
  return context.knownLinkIds.has(linkId) ? linkId : null
}

const tokensIn = (context: ReviewViewContext, path: string, text: string): CodeToken[] => [
  ...(context.tracedLineTokens.get(tracedLineTokenKeyOf(path, text)) ?? [{ text, kind: "plain" as const }]),
]

const toCodeLine = (context: ReviewViewContext, path: string, { line, text, isChanged }: TracedLine): CodeLine => ({
  numberLabel: String(line),
  mark: isChanged ? "added" : "context",
  isFocused: false,
  tokens: tokensIn(context, path, text),
})

const toTracedCode = (context: ReviewViewContext, node: DeclarationNode): CodeLink | null => {
  if (node.tracedLines.length === 0) return null
  const lineNumbers = node.tracedLines.map((tracedLine) => tracedLine.line)
  const range = { lineStart: Math.min(...lineNumbers), lineEnd: Math.max(...lineNumbers) }
  return {
    pathLabel: node.path,
    rangeLabel: rangeLabelOf(range),
    lines: node.tracedLines.map((line) => toCodeLine(context, node.path, line)),
    anchorId: null,
    forgeLink: context.blobLinkOf(node.path, range),
  }
}

const changeOf = ({ changeType, isAdded }: DeclarationNode): NodeChange | null => {
  if (changeType !== "diff") return null
  return isAdded ? "added" : "modified"
}

const boxOf = ({ x, y, width, height }: { readonly x: number, readonly y: number, readonly width: number, readonly height: number }) => ({ x, y, width, height })

const toFrameView = (frame: FrameLayout, layout: JourneyLayout): UiFrameView => {
  const change = frame.node === null ? null : changeOf(frame.node)
  return {
    ...boxOf(frame),
    key: frame.key,
    nodeId: frame.node?.id ?? null,
    depth: frame.depth,
    label: frame.name,
    isDraft: frame.node !== null && frame.node.label === null,
    conditionLabel: frame.conditionLabel,
    change,
    changedLabel: change === null ? null : CHANGE_LABELS[change],
    data: frame.data.map(({ name, changeType }) => ({ name, changeType })),
    hiddenDataLabel: frame.hiddenDataCount === 0 ? null : `+${String(frame.hiddenDataCount)} more`,
    hasLineOut: layout.lineOutKeys.has(frame.key),
    hasLineIn: layout.lineInKeys.has(frame.key),
  }
}

const toTriggerView = (trigger: TriggerLayout): UiTriggerView => ({
  ...boxOf(trigger),
  key: trigger.key,
  entryPointId: trigger.entryPoint.id,
  eventNodeId: trigger.eventNodeId,
  label: trigger.entryPoint.label,
  sublabel: trigger.sublabel,
})

const toCardView = (card: PlacedCard, layout: JourneyLayout): UiCardView => ({
  ...boxOf(card),
  id: card.id,
  kindLabel: UI_CARD_LABEL,
  label: card.frames[0].declaration,
  sublabel: card.frames[0].path,
  frames: card.frames.map((frame) => toFrameView(frame, layout)),
  triggers: card.triggers.map(toTriggerView),
})

const toNodeView = ({ node, isInsideCard, ...box }: PlacedNode, context: ReviewViewContext): JourneyNodeView => {
  const description = node.description === null ? null : parseProse(node.description, context.knownLinkIds)
  const change = node.kind === "entry-point" ? null : changeOf(node)
  const tracedCode = node.kind === "entry-point" ? null : toTracedCode(context, node)
  return node.kind === "entry-point"
    ? {
        ...box,
        id: node.id,
        kind: "entry-point",
        change: null,
        category: null,
        kindLabel: ENTRY_POINT_LABEL,
        changedLabel: null,
        label: node.label,
        isDraft: false,
        sublabel: null,
        description,
        codeLinkId: null,
        tracedCode: null,
        tracedHeading: null,
        isInsideCard,
      }
    : {
        ...box,
        id: node.id,
        kind: "code",
        change,
        category: node.category,
        kindLabel: CATEGORY_LABELS[node.category],
        changedLabel: change === null ? null : CHANGE_LABELS[change],
        label: node.label ?? node.declaration,
        isDraft: node.label === null,
        sublabel: node.path,
        description,
        codeLinkId: knownLinkId(context, node.path, node.declaration),
        tracedCode,
        tracedHeading: tracedCode === null ? null : TRACED_HEADING,
        isInsideCard,
      }
}

const toEdgeView = ({ id, edge, points, labelPoint, isInsideCard }: PlacedEdge): JourneyEdgeView => {
  const label = edgeLabelOf(edge)
  return {
    id,
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    isAssumed: edge.certainty === "assumed",
    points: [...points],
    label: label === null || labelPoint === null ? null : { text: label, ...labelPoint },
    isInsideCard,
  }
}

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
    uiCards: layout.cards.map((card) => toCardView(card, layout)),
    edges: layout.edges.map(toEdgeView),
  }
}

export const buildJourney = (
  segment: Segment,
  scope: string,
  settings: DiagramSettings,
  context: ReviewViewContext,
): JourneyBand => ({
  anchorId: `${scope}${JOURNEY_ANCHOR_NAME}`,
  heading: "Journey Flow Diagram",
  diagram: segment.journey === null ? null : toDiagram(segment.journey, scope, settings, context),
})
