import { frameTokenKeyOf } from "@/code/highlight-review"
import { codeLinkIdOf, rangeLabelOf } from "@/code/links"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import type {
  CodeLine,
  CodeLink,
  CodeToken,
  DeclarationNode,
  FrameLine,
  JourneyBand,
  JourneyCallStackView,
  JourneyEdge,
  JourneyEdgeView,
  JourneyFlow,
  JourneyFrameView,
  JourneyNodeView,
  NodeCategory,
  NodeChange,
  Segment,
} from "@flightplan/configurations"
import { edgeLabelOf } from "./edge-label"
import { filterJourney, type DiagramSettings } from "./filter"
import { layoutJourney, type PlacedEdge, type PlacedNode } from "./layout"

const JOURNEY_ANCHOR_NAME = "journey-flow-diagram"

const CATEGORY_LABELS: Readonly<Record<NodeCategory, string>> = {
  guard: "Guard",
  logic: "Logic",
  data: "Data",
  type: "Type",
  ui: "UI",
  config: "Config",
}

const ENTRY_POINT_LABEL = "Entry point"
const CHANGE_LABELS: Readonly<Record<NodeChange, string>> = { added: "Added", modified: "Modified" }
const CALL_STACK_HEADING = "Call stack"

const knownLinkId = (context: ReviewViewContext, path: string, declaration: string): string | null => {
  const linkId = codeLinkIdOf(path, declaration)
  return context.knownLinkIds.has(linkId) ? linkId : null
}

const tokensIn = (context: ReviewViewContext, path: string, text: string): CodeToken[] => [
  ...(context.frameTokens.get(frameTokenKeyOf(path, text)) ?? [{ text, kind: "plain" as const }]),
]

const toCodeLine = (context: ReviewViewContext, path: string, { line, text, isChanged }: FrameLine): CodeLine => ({
  numberLabel: String(line),
  mark: isChanged ? "added" : "context",
  isFocused: false,
  tokens: tokensIn(context, path, text),
})

const toFrameView = (context: ReviewViewContext, node: DeclarationNode, frameLines: readonly FrameLine[]): JourneyFrameView => {
  const change = changeOf(node)
  return {
    label: node.label ?? node.declaration,
    pathLabel: node.path,
    changedLabel: change === null ? null : CHANGE_LABELS[change],
    lines: frameLines.map((line) => toCodeLine(context, node.path, line)),
  }
}

const toTracedCode = (context: ReviewViewContext, node: DeclarationNode): CodeLink | null => {
  if (node.frameLines.length === 0) return null
  const lineNumbers = node.frameLines.map((frameLine) => frameLine.line)
  const range = { lineStart: Math.min(...lineNumbers), lineEnd: Math.max(...lineNumbers) }
  return {
    pathLabel: node.path,
    rangeLabel: rangeLabelOf(range),
    lines: node.frameLines.map((line) => toCodeLine(context, node.path, line)),
    anchorId: null,
    forgeLink: context.blobLinkOf(node.path, range),
  }
}

const toCallStackView = (context: ReviewViewContext, flow: JourneyFlow, node: DeclarationNode, arriving: JourneyEdge): JourneyCallStackView => {
  const parent = flow.nodes.find((candidate) => candidate.id === arriving.from)
  const ownFrame = toFrameView(context, node, node.frameLines)
  const actedFrame = arriving.frameLines.length === 0 ? ownFrame : toFrameView(context, node, arriving.frameLines)
  if (parent?.kind !== "declaration") return { label: parent?.label ?? ownFrame.label, frames: [actedFrame] }
  return { label: parent.label ?? parent.declaration, frames: [toFrameView(context, parent, arriving.frameLines), ownFrame] }
}

const callStacksOf = (context: ReviewViewContext, flow: JourneyFlow, node: DeclarationNode): JourneyCallStackView[] => {
  const stacks = flow.edges.filter((edge) => edge.to === node.id).map((arriving) => toCallStackView(context, flow, node, arriving))
  return stacks.filter((stack) => stack.frames.some((frame) => frame.lines.length > 0))
}

const changeOf = ({ isChanged, isAdded }: DeclarationNode): NodeChange | null => {
  if (!isChanged) return null
  return isAdded ? "added" : "modified"
}

const toNodeView = ({ node, ...box }: PlacedNode, context: ReviewViewContext, flow: JourneyFlow): JourneyNodeView => {
  const description = node.description === null ? null : parseProse(node.description, context.knownLinkIds)
  const change = node.kind === "entry-point" ? null : changeOf(node)
  const callStacks = node.kind === "entry-point" ? [] : callStacksOf(context, flow, node)
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
        callStackHeading: null,
        callStacks: [],
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
        tracedCode: toTracedCode(context, node),
        callStackHeading: callStacks.length === 0 ? null : CALL_STACK_HEADING,
        callStacks,
      }
}

const toEdgeView = ({ edge, points, labelPoint }: PlacedEdge): JourneyEdgeView => {
  const label = edgeLabelOf(edge)
  return {
    id: `${edge.from}>${edge.to}:${edge.kind}`,
    from: edge.from,
    to: edge.to,
    kind: edge.kind,
    isAssumed: edge.certainty === "assumed",
    points: [...points],
    label: label === null ? null : { text: label, ...labelPoint },
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
    nodes: layout.nodes.map((placed) => toNodeView(placed, context, filtered)),
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
