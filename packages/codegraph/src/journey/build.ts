import { codeLinkIdOf } from "@/code/links"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type { WaypointPlace } from "@/walkthrough/build"
import type {
  DeclarationNode,
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
import { buildNodeCodeViews, type CodeViewSetting } from "./code-views"
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
const UI_CARD_LABEL = "UI"
const RETURN_CATEGORY: NodeCategory = "ui"

const knownLinkId = (context: ReviewViewContext, path: string, declaration: string): string | null => {
  const linkId = codeLinkIdOf(path, declaration)
  return context.knownLinkIds.has(linkId) ? linkId : null
}

const changeOf = ({ changeType, isAdded }: Pick<DeclarationNode, "changeType" | "isAdded">): NodeChange | null => {
  if (changeType !== "diff") return null
  return isAdded ? "added" : "modified"
}

const boxOf = ({ x, y, width, height }: { readonly x: number, readonly y: number, readonly width: number, readonly height: number }) => ({ x, y, width, height })

const changedLabelOf = (change: NodeChange | null): string | null => (change === null ? null : CHANGE_LABELS[change])

const frameWordsOf = ({ role, node, componentReturn, name, declaration, path }: FrameLayout): Pick<UiFrameView, "nodeId" | "label" | "sublabel" | "isDraft" | "change"> => {
  if (role === "group") return { nodeId: node?.id ?? null, label: declaration, sublabel: path, isDraft: false, change: null }
  if (componentReturn !== null) return { nodeId: componentReturn.id, label: name, sublabel: null, isDraft: componentReturn.label === null, change: changeOf(componentReturn) }
  return { nodeId: node?.id ?? null, label: name, sublabel: null, isDraft: node !== null && node.label === null, change: node === null ? null : changeOf(node) }
}

const toFrameView = (frame: FrameLayout, layout: JourneyLayout): UiFrameView => {
  const words = frameWordsOf(frame)
  return {
    ...boxOf(frame),
    ...words,
    key: frame.key,
    role: frame.role,
    ownerNodeId: frame.node?.id ?? null,
    depth: frame.depth,
    changedLabel: changedLabelOf(words.change),
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
  label: card.declaration,
  sublabel: card.path,
  nodeId: card.headerNode?.id ?? null,
  hasLineOut: layout.lineOutKeys.has(card.id),
  hasLineIn: layout.lineInKeys.has(card.id),
  frames: card.frames.map((frame) => toFrameView(frame, layout)),
  triggers: card.triggers.map(toTriggerView),
})

const toNodeView = ({ node, isInsideCard, ...box }: PlacedNode, setting: CodeViewSetting, context: ReviewViewContext): JourneyNodeView => {
  const description = node.description === null ? null : parseProse(node.description, context.knownLinkIds)
  const change = node.kind === "entry-point" ? null : changeOf(node)
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
        codeViews: [],
        isInsideCard,
      }
    : {
        ...box,
        id: node.id,
        kind: "code",
        change,
        category: node.category,
        kindLabel: CATEGORY_LABELS[node.category],
        changedLabel: changedLabelOf(change),
        label: node.label ?? node.declaration,
        isDraft: node.label === null,
        sublabel: node.path,
        description,
        codeLinkId: knownLinkId(context, node.path, node.declaration),
        codeViews: buildNodeCodeViews(node.id, node.codeViews, setting, context),
        isInsideCard,
      }
}

const toReturnNodeViews = (frame: FrameLayout, setting: CodeViewSetting, context: ReviewViewContext): JourneyNodeView[] => {
  const { componentReturn, path, declaration } = frame
  if (componentReturn === null) return []
  const change = changeOf(componentReturn)
  return [
    {
      ...boxOf(frame),
      id: componentReturn.id,
      kind: "return",
      change,
      category: RETURN_CATEGORY,
      kindLabel: CATEGORY_LABELS[RETURN_CATEGORY],
      changedLabel: changedLabelOf(change),
      label: componentReturn.label ?? componentReturn.statement,
      isDraft: componentReturn.label === null,
      sublabel: path,
      description: componentReturn.description === null ? null : parseProse(componentReturn.description, context.knownLinkIds),
      codeLinkId: knownLinkId(context, path, declaration),
      codeViews: buildNodeCodeViews(componentReturn.id, componentReturn.codeViews, setting, context),
      isInsideCard: true,
    },
  ]
}

const toEdgeView = ({ id, edge, points, isInsideCard }: PlacedEdge): JourneyEdgeView => ({
  id,
  from: edge.from,
  to: edge.to,
  points: [...points],
  isInsideCard,
})

const nodeSummaryLabel = (shownCount: number, totalCount: number): string =>
  shownCount === totalCount
    ? countLabel(totalCount, "node", "nodes")
    : `${String(shownCount)} of ${countLabel(totalCount, "node", "nodes")}`

const toDiagram = (
  flow: JourneyFlow,
  scope: string,
  settings: DiagramSettings,
  setting: CodeViewSetting,
  context: ReviewViewContext,
): NonNullable<JourneyBand["diagram"]> => {
  const filtered = filterJourney(flow, settings)
  const layout = layoutJourney(filtered)
  return {
    anchorId: `${scope}journey-${flow.id}`,
    title: flow.title,
    summaryLabel: nodeSummaryLabel(filtered.nodes.length, flow.nodes.length),
    width: layout.width,
    height: layout.height,
    nodes: [
      ...layout.nodes.map((placed) => toNodeView(placed, setting, context)),
      ...layout.cards.flatMap((card) => card.frames.flatMap((frame) => toReturnNodeViews(frame, setting, context))),
    ],
    uiCards: layout.cards.map((card) => toCardView(card, layout)),
    edges: layout.edges.map(toEdgeView),
  }
}

export const buildJourney = (
  segment: Segment,
  scope: string,
  settings: DiagramSettings,
  places: readonly WaypointPlace[],
  context: ReviewViewContext,
): JourneyBand => ({
  anchorId: `${scope}${JOURNEY_ANCHOR_NAME}`,
  heading: "Journey Flow Diagram",
  diagram: segment.journey === null
    ? null
    : toDiagram(segment.journey, scope, settings, { places, changedPaths: segment.changedPaths }, context),
})
