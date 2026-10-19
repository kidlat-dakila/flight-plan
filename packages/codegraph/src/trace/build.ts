import { findSource, rowSpanOf } from "@/code/lines"
import { codeLinkIdOf } from "@/code/links"
import { classificationViewOf } from "@/code-blocks/classification-view"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import { listTraceNodes } from "@/trace-diagram"
import { linesLabelOf } from "@/trace-diagram/added-cards"
import { listListedBlocks, type ListedBlock } from "@/trace-diagram/listed-blocks"
import { eventHandedTo, isFoldedValue, isHandlerBlock, listNodeSteps, nodeBlockAround, type NodeStep } from "@/trace-diagram/node-blocks"
import type { WaypointPlace } from "@/walkthrough/build"
import type {
  CodeBlock,
  TraceBand,
  TraceBlockListView,
  TraceEdgeView,
  TraceDiagram,
  TraceNode,
  TraceNodeEdge,
  TraceNodeView,
  TraceRow,
  TraceRowGroupView,
  TraceTriggerLabelView,
  LineSpan,
  NodeChange,
  Segment,
  TriggerLabel,
} from "@flightplan/configurations"
import { BLOCK_LIST_KINDS, headOfNode, labelOfRow, listRowGroups, listsNoRows } from "./cards"
import { buildNodeCodeViews, type CodeViewSetting } from "./code-views"
import { BLOCK_TYPE_LABELS, nameOfBlock } from "./names"
import { parametersOf } from "./parameters"

const TRACE_ANCHOR_NAME = "trace-diagram"

const CHANGE_LABELS: Readonly<Record<NodeChange, string>> = { added: "Added", modified: "Modified" }
const PATH_SEPARATOR = "/"
const SHORT_PATH_SEGMENT_COUNT = 3
const TITLE_SEPARATOR = ", "
const EDGE_END_SEPARATOR = " -> "
const TITLED_NODE_COUNT = 3
type RowIdByBlockId = ReadonlyMap<string, string>

const NO_ROW_IDS: RowIdByBlockId = new Map()
const LIST_KEY_SEPARATOR = ":"
const EMPTY_TITLE = "Empty diagram"
const UNWRITTEN_LABEL = "Not written yet."
const UNWRITTEN_MARKDOWN = ""
const DEFAULT_SIDE = "left"

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

const changeOfNode = ({ codeBlocks: [root], diffCodeBlocks }: TraceNode, context: ReviewViewContext): NodeChange | null => {
  if (diffCodeBlocks.length === 0) return null
  return isWhollyAdded(root, context) ? "added" : "modified"
}

const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const listHandlers = (event: CodeBlock): CodeBlock[] => [
  ...event.childrenBlocks.filter(isHandlerBlock),
  ...event.nextBlocks.filter((next) => eventHandedTo(next)?.id === event.id),
]

const hasChange = (block: CodeBlock): boolean => isChanged(block) || listHandlers(block).some(isChanged)

const inLineOrder = (spans: readonly LineSpan[]): LineSpan[] => [...spans].sort(([oneStart], [twoStart]) => oneStart - twoStart)

const linesWithHandlers = (block: CodeBlock): LineSpan[] => inLineOrder([block, ...listHandlers(block).filter((handler) => handler.parentBlock?.id !== block.id)].flatMap(lineSpansOf))

const changeOfBlock = (block: CodeBlock): NodeChange | null => (hasChange(block) ? "modified" : null)

const toTriggerLabelView = ({ label, codeBlock }: TriggerLabel): TraceTriggerLabelView => {
  const name = nameOfBlock(codeBlock)
  return {
    id: codeBlock.id,
    type: codeBlock.type,
    typeLabel: BLOCK_TYPE_LABELS[codeBlock.type],
    name,
    label: label ?? name,
    isDraft: label === null,
    change: changeOfBlock(codeBlock),
    lines: linesWithHandlers(codeBlock),
  }
}

const rowIdAround = (block: CodeBlock, rowIdByBlockId: RowIdByBlockId): string | null => {
  const rowId = rowIdByBlockId.get(block.id)
  if (rowId !== undefined) return rowId
  return block.parentBlock === null ? null : rowIdAround(block.parentBlock, rowIdByBlockId)
}

const listRows = (node: TraceNode): ListedBlock[] => {
  const [nodeBlock, ...insideBlocks] = node.codeBlocks
  return listsNoRows(node) ? [] : listListedBlocks(nodeBlock, insideBlocks)
}

const rowIdByBlockIdOf = (node: TraceNode): RowIdByBlockId =>
  node.rows === undefined
    ? new Map([
        ...listRows(node).flatMap(({ block, statements }) => statements.map((statement) => [statement.id, block.id] as const)),
        ...node.triggerLabels.map(({ codeBlock }) => [codeBlock.id, codeBlock.id] as const),
      ])
    : new Map(node.rows.map((row) => [row.id, row.id] as const))

const inRowOrder = (rows: readonly TraceRow[]): TraceRow[] =>
  [...rows].sort((one, two) => one.lineStart - two.lineStart || one.lineEnd - two.lineEnd)

const toStoredRowView = (row: TraceRow, node: TraceNode): TraceTriggerLabelView => {
  const block = node.codeBlocks.find((candidate) => candidate.id === row.id)
  const name = block === undefined ? linesLabelOf(row) : nameOfBlock(block)
  return {
    id: row.id,
    type: row.type,
    typeLabel: BLOCK_TYPE_LABELS[row.type],
    name,
    label: row.label ?? name,
    isDraft: row.label === null,
    change: block === undefined ? null : changeOfBlock(block),
    lines: [[row.lineStart, row.lineEnd]],
  }
}

const groupStoredRows = (rows: readonly TraceRow[]): TraceRowGroupView[] =>
  rows.length === 0 ? [] : [{ label: null, rowIds: rows.map((row) => row.id), childIds: [] }]

const linesOfRow = ({ statements }: ListedBlock): LineSpan[] => {
  const spans = statements.flatMap(lineSpansOf)
  if (statements.length === 1) return spans
  return [[Math.min(...spans.map(([lineStart]) => lineStart)), Math.max(...spans.map(([, lineEnd]) => lineEnd))]]
}

const toBlockLists = (node: TraceNode, rows: readonly ListedBlock[]): TraceBlockListView[] => {
  const writtenById = new Map(node.blockLabels.map(({ label, codeBlock }) => [codeBlock.id, label] as const))
  const rowIdByBlockId = rowIdByBlockIdOf(node)
  const changedRowIds = new Set(node.codeBlocks.filter(hasChange).map((block) => rowIdAround(block, rowIdByBlockId)))
  const listKeyOf = (row: ListedBlock): string => [row.kind, labelOfRow(row)].join(LIST_KEY_SEPARATOR)
  const rowsInKindOrder = BLOCK_LIST_KINDS.flatMap((kind) => rows.filter((row) => row.kind === kind))
  return [...groupBy(rowsInKindOrder, listKeyOf).values()].map((listed) => ({
    kind: listed[0].kind,
    label: labelOfRow(listed[0]),
    blocks: listed.map((row) => {
      const { block, name } = row
      const written = writtenById.get(block.id) ?? null
      const change: NodeChange | null = changedRowIds.has(block.id) ? "modified" : null
      return { id: block.id, name, label: written ?? name, isDraft: written === null, change, lines: linesOfRow(row) }
    }),
  }))
}

const codeLinesOf = ({ codeBlocks: [root, ...insideBlocks] }: TraceNode): LineSpan[] =>
  inLineOrder([root, ...insideBlocks.filter((block) => eventHandedTo(block)?.id === root.id || isFoldedValue(block))].flatMap(lineSpansOf))

const toNodeView = (node: TraceNode, setting: CodeViewSetting, context: ReviewViewContext): TraceNodeView => {
  const [root] = node.codeBlocks
  const path = filePathOf(root)
  const { name, typeLabel } = headOfNode(node, { name: nameOfBlock(root), typeLabel: BLOCK_TYPE_LABELS[node.type] })
  const change = changeOfNode(node, context)
  const linkId = codeLinkIdOf(path, name)
  const storedRows = node.rows === undefined ? null : inRowOrder(node.rows)
  const rows = storedRows === null ? listRows(node) : []
  return {
    id: node.id,
    type: node.type,
    typeLabel,
    classification: classificationViewOf(root),
    change,
    changedLabel: change === null ? null : CHANGE_LABELS[change],
    label: node.label ?? name,
    isDraft: node.label === null,
    name,
    shortPath: shortPathOf(path),
    description: node.description === null ? null : parseProse(node.description, context.knownLinkIds),
    codeLinkId: context.knownLinkIds.has(linkId) ? linkId : null,
    codeViews: buildNodeCodeViews(node.id, { path, lines: codeLinesOf(node) }, setting, context),
    parameters: parametersOf(node.type, root, context),
    blockLists: storedRows === null ? toBlockLists(node, rows) : [],
    triggerLabels: storedRows === null ? node.triggerLabels.map(toTriggerLabelView) : storedRows.map((row) => toStoredRowView(row, node)),
    rowGroups: storedRows === null ? listRowGroups(node, rows) : groupStoredRows(storedRows),
    position: node.position ?? null,
    children: node.children.map((child) => toNodeView(child, setting, context)),
  }
}

const edgeIdOf = (from: string, to: string): string => [from, to].join(EDGE_END_SEPARATOR)

const toEdgeView = ({ from, to }: TraceNodeEdge, fromRowId: string | null, toRowId: string | null): TraceEdgeView => ({
  id: edgeIdOf(fromRowId ?? from, toRowId ?? to),
  from,
  to,
  fromRowId,
  toRowId,
  toSide: DEFAULT_SIDE,
})

const isDrawnByAuthor = (edge: TraceNodeEdge): boolean => edge.fromRowId !== undefined || edge.toSide !== undefined

const toAuthorEdgeView = ({ id, from, to, fromRowId, toSide }: TraceNodeEdge): TraceEdgeView => ({
  id,
  from,
  to,
  fromRowId: fromRowId ?? null,
  toRowId: null,
  toSide: toSide ?? DEFAULT_SIDE,
})

const listDiagramSteps = (nodes: readonly TraceNode[]): NodeStep[] => {
  const blocks = firstOfEach(nodes.flatMap((node) => node.codeBlocks), (block) => block.id)
  const blockIds = new Set(blocks.map((block) => block.id))
  return listNodeSteps(blocks, (block) => block.nextBlocks.filter((next) => blockIds.has(next.id)))
}

const toEdgeViews = (edge: TraceNodeEdge, steps: readonly NodeStep[], nodeById: ReadonlyMap<string, TraceNode>, rowIdsByNodeId: ReadonlyMap<string, RowIdByBlockId>): TraceEdgeView[] => {
  if (isDrawnByAuthor(edge)) return [toAuthorEdgeView(edge)]
  const fromRowIds = rowIdsByNodeId.get(edge.from) ?? NO_ROW_IDS
  const toRowIds = rowIdsByNodeId.get(edge.to) ?? NO_ROW_IDS
  const heldBlock = nodeById.get(edge.to)?.codeBlocks[0]
  const held = heldBlock !== undefined && nodeBlockAround(heldBlock)?.id === edge.from ? [toEdgeView(edge, rowIdAround(heldBlock, fromRowIds), null)] : []
  const stepped = steps.map(({ fromBlock, to, toBlock }) => toEdgeView(edge, rowIdAround(fromBlock, fromRowIds), toBlock.id === to.id ? null : rowIdAround(toBlock, toRowIds)))
  const views = firstOfEach([...held, ...stepped], (view) => view.id)
  return views.length === 0 ? [toEdgeView(edge, null, null)] : views
}

const titleOf = (nodes: readonly TraceNode[]): string => {
  const changed = nodes.filter((node) => node.diffCodeBlocks.length > 0)
  const titled = (changed.length === 0 ? nodes : changed).map((node) => headOfNode(node, { name: nameOfBlock(node.codeBlocks[0]), typeLabel: BLOCK_TYPE_LABELS[node.type] }).name)
  const shown = titled.slice(0, TITLED_NODE_COUNT).join(TITLE_SEPARATOR)
  return titled.length > TITLED_NODE_COUNT ? `${shown} +${String(titled.length - TITLED_NODE_COUNT)} more` : shown
}

const toDiagram = (traceDiagram: TraceDiagram, segmentId: string, scope: string, setting: CodeViewSetting, context: ReviewViewContext): NonNullable<TraceBand["diagram"]> => {
  const nodes = listTraceNodes(traceDiagram.traceNodes)
  const nodeViews = traceDiagram.traceNodes.map((node) => toNodeView(node, setting, context))
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const))
  const rowIdsByNodeId = new Map(nodes.map((node) => [node.id, rowIdByBlockIdOf(node)] as const))
  const stepsByEdgeId = groupBy(listDiagramSteps(nodes), (step) => edgeIdOf(step.from.id, step.to.id))
  return {
    anchorId: `${scope}trace-${segmentId}`,
    title: nodes.length === 0 ? EMPTY_TITLE : titleOf(nodes),
    description: traceDiagram.description === null ? null : parseProse(traceDiagram.description, context.knownLinkIds),
    descriptionMarkdown: traceDiagram.description ?? UNWRITTEN_MARKDOWN,
    unwrittenLabel: UNWRITTEN_LABEL,
    nodes: nodeViews,
    edges: traceDiagram.traceNodeEdges.flatMap((edge) => toEdgeViews(edge, stepsByEdgeId.get(edge.id) ?? [], nodeById, rowIdsByNodeId)),
  }
}

export const buildTrace = (segment: Segment, scope: string, places: readonly WaypointPlace[], context: ReviewViewContext): TraceBand => ({
  anchorId: `${scope}${TRACE_ANCHOR_NAME}`,
  heading: "Trace Diagram",
  diagram: segment.traceDiagram === null
    ? null
    : toDiagram(segment.traceDiagram, segment.id, scope, { places, changedPaths: segment.changedPaths }, context),
})
