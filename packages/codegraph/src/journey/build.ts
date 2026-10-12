import { findSource, rowSpanOf } from "@/code/lines"
import { codeLinkIdOf } from "@/code/links"
import { listJourneyNodes } from "@/journey-flow-diagram"
import { listListedBlocks } from "@/journey-flow-diagram/listed-blocks"
import { isBodyBlock, listNodeSteps, nodeBlockAround, type NodeStep } from "@/journey-flow-diagram/node-blocks"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import type { WaypointPlace } from "@/walkthrough/build"
import type {
  CodeBlock,
  JourneyBand,
  JourneyBlockListView,
  JourneyEdgeView,
  JourneyFlowDiagram,
  JourneyNode,
  JourneyNodeEdge,
  JourneyNodeView,
  JourneyTriggerLabelView,
  LineSpan,
  NodeBlockListKind,
  NodeChange,
  Segment,
  TriggerLabel,
} from "@flightplan/configurations"
import { buildNodeCodeViews, type CodeViewSetting } from "./code-views"
import { BLOCK_TYPE_LABELS, nameOfBlock } from "./names"

const JOURNEY_ANCHOR_NAME = "journey-flow-diagram"

const CHANGE_LABELS: Readonly<Record<NodeChange, string>> = { added: "Added", modified: "Modified" }
const PATH_SEPARATOR = "/"
const SHORT_PATH_SEGMENT_COUNT = 3
const TITLE_SEPARATOR = ", "
const EDGE_END_SEPARATOR = " -> "
const TITLED_NODE_COUNT = 3
const NO_ROW_IDS: ReadonlySet<string> = new Set()
const BLOCK_LIST_KINDS: readonly NodeBlockListKind[] = ["argument", "state", "hook", "effect", "step"]
const BLOCK_LIST_LABELS: Readonly<Record<NodeBlockListKind, string>> = { argument: "Args", state: "State", hook: "Hooks", effect: "Effects", step: "Steps" }

const filePathOf = (block: CodeBlock): string => block.astGraph.filePath

const shortPathOf = (path: string): string => path.split(PATH_SEPARATOR).slice(-SHORT_PATH_SEGMENT_COUNT).join(PATH_SEPARATOR)

const lineSpansOf = (block: CodeBlock): LineSpan[] => block.lineOfCodeRangeReference.map(({ start, end }) => [start.line, end.line])

const isWhollyAdded = (block: CodeBlock, context: ReviewViewContext): boolean => {
  const source = findSource(context.sources, filePathOf(block))?.source
  if (source === undefined) return false
  const rows = lineSpansOf(block).flatMap(([lineStart, lineEnd]) => {
    const span = rowSpanOf(source, { lineStart, lineEnd })
    return span === null ? [] : source.lines.slice(span.start, span.end + 1)
  })
  return rows.length > 0 && rows.every((row) => row.mark === "added")
}

const changeOfNode = ({ codeBlocks: [root], diffCodeBlocks }: JourneyNode, context: ReviewViewContext): NodeChange | null => {
  if (diffCodeBlocks.length === 0) return null
  return isWhollyAdded(root, context) ? "added" : "modified"
}

const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const hasChange = (block: CodeBlock): boolean => isChanged(block) || block.childrenBlocks.some((child) => isBodyBlock(child) && isChanged(child))

const changeOfBlock = (block: CodeBlock): NodeChange | null => (hasChange(block) ? "modified" : null)

const toTriggerLabelView = ({ label, codeBlock }: TriggerLabel): JourneyTriggerLabelView => {
  const name = nameOfBlock(codeBlock)
  return {
    id: codeBlock.id,
    type: codeBlock.type,
    typeLabel: BLOCK_TYPE_LABELS[codeBlock.type],
    name,
    label: label ?? name,
    isDraft: label === null,
    change: changeOfBlock(codeBlock),
    lines: lineSpansOf(codeBlock),
  }
}

const toBlockLists = ({ codeBlocks: [nodeBlock, ...insideBlocks], blockLabels }: JourneyNode): JourneyBlockListView[] => {
  const writtenById = new Map(blockLabels.map(({ label, codeBlock }) => [codeBlock.id, label] as const))
  const shown = listListedBlocks(nodeBlock, insideBlocks)
  return BLOCK_LIST_KINDS.flatMap((kind) => {
    const blocks = shown.filter((one) => one.kind === kind).map(({ block, name }) => {
      const written = writtenById.get(block.id) ?? null
      return { id: block.id, name, label: written ?? name, isDraft: written === null, change: changeOfBlock(block), lines: lineSpansOf(block) }
    })
    return blocks.length === 0 ? [] : [{ kind, label: BLOCK_LIST_LABELS[kind], blocks }]
  })
}

const toNodeView = (node: JourneyNode, setting: CodeViewSetting, context: ReviewViewContext): JourneyNodeView => {
  const [root] = node.codeBlocks
  const path = filePathOf(root)
  const name = nameOfBlock(root)
  const change = changeOfNode(node, context)
  const linkId = codeLinkIdOf(path, name)
  return {
    id: node.id,
    type: node.type,
    typeLabel: BLOCK_TYPE_LABELS[node.type],
    change,
    changedLabel: change === null ? null : CHANGE_LABELS[change],
    label: node.label ?? name,
    isDraft: node.label === null,
    name,
    shortPath: shortPathOf(path),
    description: node.description === null ? null : parseProse(node.description, context.knownLinkIds),
    codeLinkId: context.knownLinkIds.has(linkId) ? linkId : null,
    codeViews: buildNodeCodeViews(node.id, { path, lines: lineSpansOf(root) }, setting, context),
    blockLists: toBlockLists(node),
    triggerLabels: node.triggerLabels.map(toTriggerLabelView),
    children: node.children.map((child) => toNodeView(child, setting, context)),
  }
}

const listNodeViews = (nodes: readonly JourneyNodeView[]): JourneyNodeView[] => nodes.flatMap((node) => [node, ...listNodeViews(node.children)])

const rowIdsOf = ({ blockLists, triggerLabels }: JourneyNodeView): ReadonlySet<string> =>
  new Set([...blockLists.flatMap(({ blocks }) => blocks.map((block) => block.id)), ...triggerLabels.map((trigger) => trigger.id)])

const rowIdAround = (block: CodeBlock, rowIds: ReadonlySet<string>): string | null => {
  if (rowIds.has(block.id)) return block.id
  return block.parentBlock === null ? null : rowIdAround(block.parentBlock, rowIds)
}

const edgeIdOf = (from: string, to: string): string => [from, to].join(EDGE_END_SEPARATOR)

const toEdgeView = ({ from, to }: JourneyNodeEdge, fromRowId: string | null, toRowId: string | null): JourneyEdgeView => ({
  id: edgeIdOf(fromRowId ?? from, toRowId ?? to),
  from,
  to,
  fromRowId,
  toRowId,
})

const listDiagramSteps = (nodes: readonly JourneyNode[]): NodeStep[] => {
  const blocks = firstOfEach(nodes.flatMap((node) => node.codeBlocks), (block) => block.id)
  const blockIds = new Set(blocks.map((block) => block.id))
  return listNodeSteps(blocks, (block) => block.nextBlocks.filter((next) => blockIds.has(next.id)))
}

const toEdgeViews = (edge: JourneyNodeEdge, steps: readonly NodeStep[], nodeById: ReadonlyMap<string, JourneyNode>, rowIdsByNodeId: ReadonlyMap<string, ReadonlySet<string>>): JourneyEdgeView[] => {
  const fromRowIds = rowIdsByNodeId.get(edge.from) ?? NO_ROW_IDS
  const toRowIds = rowIdsByNodeId.get(edge.to) ?? NO_ROW_IDS
  const heldBlock = nodeById.get(edge.to)?.codeBlocks[0]
  const held = heldBlock !== undefined && nodeBlockAround(heldBlock)?.id === edge.from ? [toEdgeView(edge, rowIdAround(heldBlock, fromRowIds), null)] : []
  const stepped = steps.map(({ fromBlock, to, toBlock }) => toEdgeView(edge, rowIdAround(fromBlock, fromRowIds), toBlock.id === to.id ? null : rowIdAround(toBlock, toRowIds)))
  const views = firstOfEach([...held, ...stepped], (view) => view.id)
  return views.length === 0 ? [toEdgeView(edge, null, null)] : views
}

const titleOf = (nodes: readonly JourneyNode[]): string => {
  const changed = nodes.filter((node) => node.diffCodeBlocks.length > 0)
  const titled = (changed.length === 0 ? nodes : changed).map((node) => nameOfBlock(node.codeBlocks[0]))
  const shown = titled.slice(0, TITLED_NODE_COUNT).join(TITLE_SEPARATOR)
  return titled.length > TITLED_NODE_COUNT ? `${shown} +${String(titled.length - TITLED_NODE_COUNT)} more` : shown
}

const toDiagram = (journey: JourneyFlowDiagram, segmentId: string, scope: string, setting: CodeViewSetting, context: ReviewViewContext): NonNullable<JourneyBand["diagram"]> => {
  const nodes = listJourneyNodes(journey.journeyNodes)
  const nodeViews = journey.journeyNodes.map((node) => toNodeView(node, setting, context))
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const))
  const rowIdsByNodeId = new Map(listNodeViews(nodeViews).map((view) => [view.id, rowIdsOf(view)] as const))
  const stepsByEdgeId = groupBy(listDiagramSteps(nodes), (step) => edgeIdOf(step.from.id, step.to.id))
  return {
    anchorId: `${scope}journey-${segmentId}`,
    title: titleOf(nodes),
    summaryLabel: countLabel(nodes.length, "node", "nodes"),
    nodes: nodeViews,
    edges: journey.journeyNodeEdges.flatMap((edge) => toEdgeViews(edge, stepsByEdgeId.get(edge.id) ?? [], nodeById, rowIdsByNodeId)),
  }
}

export const buildJourney = (segment: Segment, scope: string, places: readonly WaypointPlace[], context: ReviewViewContext): JourneyBand => ({
  anchorId: `${scope}${JOURNEY_ANCHOR_NAME}`,
  heading: "Journey Flow Diagram",
  diagram: segment.journey === null
    ? null
    : toDiagram(segment.journey, segment.id, scope, { places, changedPaths: segment.changedPaths }, context),
})
