import { findSource, rowSpanOf } from "@/code/lines"
import { codeLinkIdOf } from "@/code/links"
import { classificationOfBlock, classificationViewOf } from "@/code-blocks/classification-view"
import { hintOf, traceHintOf } from "@/code-blocks/hints"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import { listTraceNodes } from "@/trace-diagram"
import { linesLabelOf } from "@/trace-diagram/added-cards"
import { isComponentCardBlock } from "@/trace-diagram/component-card"
import { isFunctionCardBlock } from "@/trace-diagram/function-card"
import { isHookCallBlock } from "@/trace-diagram/hook-calls"
import { listListedBlocks, type ListedBlock } from "@/trace-diagram/listed-blocks"
import { eventHandedTo, isFoldedValue, isHandlerBlock, listNodeSteps, nodeBlockAround, type NodeStep } from "@/trace-diagram/node-blocks"
import type { WaypointPlace } from "@/walkthrough/build"
import type {
  CodeBlock,
  TraceBand,
  TraceTabView,
  TraceBlockListView,
  TraceEdgeView,
  TraceDiagram,
  TraceDiagramView,
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
import { buildComponentCardView, componentRowFinder } from "./component-card"
import { buildFunctionCardView, CHANGE_LABELS, functionCardRowFinder, sourceIn, type ChangeOfBlock, type FunctionCardView, type RowFinder } from "./function-card"
import { buildHookCallCardView } from "./hook-call-card"
import { BLOCK_TYPE_LABELS, nameOfBlock } from "./names"
import { parametersOf } from "./parameters"

const TRACE_ANCHOR_NAME = "trace-diagram"

const PATH_SEPARATOR = "/"
const SHORT_PATH_SEGMENT_COUNT = 3
const TITLE_SEPARATOR = ", "
const EDGE_END_SEPARATOR = " -> "
const TITLED_NODE_COUNT = 3
type RowIdByBlockId = ReadonlyMap<string, string>

const NO_ROWS: RowFinder = { fromRowOf: () => null, toRowOf: () => null, rowCalling: () => null, calledOf: () => null }
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

const listBlocksWithin = (block: CodeBlock): CodeBlock[] => [block, ...block.childrenBlocks.flatMap(listBlocksWithin)]

const changeOfCallee = (block: CodeBlock, context: ReviewViewContext): NodeChange | null => {
  if (!listBlocksWithin(block).some(isChanged)) return null
  return isWhollyAdded(block, context) ? "added" : "modified"
}

const isCardOf = (isCardBlock: (block: CodeBlock) => boolean) => (node: TraceNode): boolean =>
  node.rows === undefined && !listsNoRows(node) && isCardBlock(node.codeBlocks[0])

export const isFunctionCardNode = isCardOf(isFunctionCardBlock)

export const isComponentCardNode = isCardOf(isComponentCardBlock)

export const isHookCallCardNode = isCardOf(isHookCallBlock)

const listHandlers = (event: CodeBlock): CodeBlock[] => [
  ...event.childrenBlocks.filter(isHandlerBlock),
  ...event.nextBlocks.filter((next) => eventHandedTo(next)?.id === event.id),
]

const hasChange = (block: CodeBlock): boolean => isChanged(block) || listHandlers(block).some(isChanged)

const inLineOrder = (spans: readonly LineSpan[]): LineSpan[] => [...spans].sort(([oneStart], [twoStart]) => oneStart - twoStart)

const linesWithHandlers = (block: CodeBlock): LineSpan[] => inLineOrder([block, ...listHandlers(block).filter((handler) => handler.parentBlock?.id !== block.id)].flatMap(lineSpansOf))

const changeOfBlock = (block: CodeBlock): NodeChange | null => (hasChange(block) ? "modified" : null)

const rowHintOf = (label: string | null, block: CodeBlock | undefined): string | null =>
  label !== null || block === undefined ? null : hintOf([block], changeOfBlock(block) ?? "unchanged")

const toTriggerLabelView = ({ label, codeBlock }: TriggerLabel): TraceTriggerLabelView => {
  const name = nameOfBlock(codeBlock)
  return {
    id: codeBlock.id,
    type: codeBlock.type,
    typeLabel: BLOCK_TYPE_LABELS[codeBlock.type],
    name,
    label: label ?? name,
    isDraft: label === null,
    hint: rowHintOf(label, codeBlock),
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

const plainRowFinder = (rowIdByBlockId: RowIdByBlockId): RowFinder => ({
  fromRowOf: (block) => rowIdAround(block, rowIdByBlockId),
  toRowOf: (block) => rowIdAround(block, rowIdByBlockId),
  rowCalling: () => null,
  calledOf: () => null,
})

const rowFinderOf = (node: TraceNode, context: ReviewViewContext): RowFinder => {
  if (isFunctionCardNode(node) || isHookCallCardNode(node)) return functionCardRowFinder(node, sourceIn(context))
  return isComponentCardNode(node) ? componentRowFinder(node, sourceIn(context)) : plainRowFinder(rowIdByBlockIdOf(node))
}

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
    hint: rowHintOf(row.label, block),
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
      return { id: block.id, name, label: written ?? name, isDraft: written === null, hint: rowHintOf(written, block), change, lines: linesOfRow(row) }
    }),
  }))
}

const codeLinesOf = ({ codeBlocks: [root, ...insideBlocks] }: TraceNode): LineSpan[] =>
  inLineOrder([root, ...insideBlocks.filter((block) => eventHandedTo(block)?.id === root.id || isFoldedValue(block))].flatMap(lineSpansOf))

const isNodeUnwritten = (node: TraceNode): boolean =>
  node.label === null || node.triggerLabels.some((trigger) => trigger.label === null) || node.blockLabels.some((listed) => listed.label === null)

const cardViewOf = (node: TraceNode, context: ReviewViewContext): FunctionCardView | null => {
  const changeOf: ChangeOfBlock = (block) => changeOfCallee(block, context)
  if (isFunctionCardNode(node)) return buildFunctionCardView(node, context, changeOf)
  if (isHookCallCardNode(node)) return buildHookCallCardView(node, context, changeOf)
  return isComponentCardNode(node) ? buildComponentCardView(node, context, changeOf) : null
}

const toNodeView = (node: TraceNode, setting: CodeViewSetting, context: ReviewViewContext): TraceNodeView => {
  const [root] = node.codeBlocks
  const path = filePathOf(root)
  const { name, typeLabel } = headOfNode(node, { name: nameOfBlock(root), typeLabel: BLOCK_TYPE_LABELS[node.type] })
  const change = changeOfNode(node, context)
  const linkId = codeLinkIdOf(path, name)
  const storedRows = node.rows === undefined ? null : inRowOrder(node.rows)
  const card = cardViewOf(node, context)
  const rows = storedRows === null && card === null ? listRows(node) : []
  return {
    id: node.id,
    type: node.type,
    typeLabel,
    classification: classificationViewOf(root),
    change,
    changedLabel: change === null ? null : CHANGE_LABELS[change],
    label: node.label ?? name,
    isDraft: node.label === null,
    hint: node.label === null ? hintOf(node.codeBlocks, change ?? "unchanged") : null,
    isBeingWritten: context.isWriting && node.isRequired && isNodeUnwritten(node),
    name,
    shortPath: shortPathOf(path),
    description: node.description === null ? null : parseProse(node.description, context.knownLinkIds),
    codeLinkId: context.knownLinkIds.has(linkId) ? linkId : null,
    codeViews: buildNodeCodeViews(node.id, { path, lines: codeLinesOf(node) }, setting, context),
    parameters: card === null ? parametersOf(node.type, root, context) : [],
    blockLists: card?.blockLists ?? (storedRows === null ? toBlockLists(node, rows) : []),
    triggerLabels: storedRows === null ? node.triggerLabels.map(toTriggerLabelView) : storedRows.map((row) => toStoredRowView(row, node)),
    rowGroups: card?.rowGroups ?? (storedRows === null ? listRowGroups(node, rows) : groupStoredRows(storedRows)),
    position: node.position ?? null,
    ...(node.width === undefined ? {} : { width: node.width }),
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

const isVaguerThan = (view: TraceEdgeView, other: TraceEdgeView): boolean => view.toRowId === null && other.toRowId !== null && view.fromRowId === other.fromRowId

const withoutVaguerViews = (views: readonly TraceEdgeView[]): TraceEdgeView[] => views.filter((view) => !views.some((other) => isVaguerThan(view, other)))

const isInside = (block: CodeBlock, holder: CodeBlock): boolean => block.parentBlock !== null && (block.parentBlock.id === holder.id || isInside(block.parentBlock, holder))

const calledInside = (fromRowId: string | null, fromRows: RowFinder, to: CodeBlock): CodeBlock | null => {
  const called = fromRowId === null ? null : fromRows.calledOf(fromRowId)
  return called !== null && isInside(called, to) ? called : null
}

const toEdgeViews = (edge: TraceNodeEdge, steps: readonly NodeStep[], nodeById: ReadonlyMap<string, TraceNode>, rowFindersByNodeId: ReadonlyMap<string, RowFinder>): TraceEdgeView[] => {
  if (isDrawnByAuthor(edge)) return [toAuthorEdgeView(edge)]
  const fromRows = rowFindersByNodeId.get(edge.from) ?? NO_ROWS
  const toRows = rowFindersByNodeId.get(edge.to) ?? NO_ROWS
  const heldBlock = nodeById.get(edge.to)?.codeBlocks[0]
  const held = heldBlock !== undefined && nodeBlockAround(heldBlock)?.id === edge.from ? [toEdgeView(edge, fromRows.fromRowOf(heldBlock, heldBlock), null)] : []
  const stepped = steps.map(({ fromBlock, to, toBlock }) => {
    const fromRowId = fromRows.fromRowOf(fromBlock, to)
    const reached = toBlock.id === to.id ? calledInside(fromRowId, fromRows, to) : toBlock
    return toEdgeView(edge, fromRowId, reached === null ? null : toRows.toRowOf(reached))
  })
  const views = withoutVaguerViews(firstOfEach([...held, ...stepped], (view) => view.id))
  const toNodeBlock = nodeById.get(edge.to)?.codeBlocks[0]
  return views.length === 0 ? [toEdgeView(edge, toNodeBlock === undefined ? null : fromRows.rowCalling(toNodeBlock), null)] : views
}

const titleOf = (nodes: readonly TraceNode[]): string => {
  const changed = nodes.filter((node) => node.diffCodeBlocks.length > 0)
  const titled = (changed.length === 0 ? nodes : changed).map((node) => headOfNode(node, { name: nameOfBlock(node.codeBlocks[0]), typeLabel: BLOCK_TYPE_LABELS[node.type] }).name)
  const shown = titled.slice(0, TITLED_NODE_COUNT).join(TITLE_SEPARATOR)
  return titled.length > TITLED_NODE_COUNT ? `${shown} +${String(titled.length - TITLED_NODE_COUNT)} more` : shown
}

const toDiagram = (traceDiagram: TraceDiagram, segmentId: string, scope: string, setting: CodeViewSetting, context: ReviewViewContext): TraceDiagramView => {
  const nodes = listTraceNodes(traceDiagram.traceNodes)
  const nodeViews = traceDiagram.traceNodes.map((node) => toNodeView(node, setting, context))
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const))
  const rowFindersByNodeId = new Map(nodes.map((node) => [node.id, rowFinderOf(node, context)] as const))
  const stepsByEdgeId = groupBy(listDiagramSteps(nodes), (step) => edgeIdOf(step.from.id, step.to.id))
  return {
    anchorId: `${scope}trace-${segmentId}`,
    title: traceDiagram.title ?? (nodes.length === 0 ? EMPTY_TITLE : titleOf(nodes)),
    writtenTitle: traceDiagram.title,
    description: traceDiagram.description === null ? null : parseProse(traceDiagram.description, context.knownLinkIds),
    descriptionMarkdown: traceDiagram.description ?? UNWRITTEN_MARKDOWN,
    descriptionHint: traceDiagram.description === null ? traceHintOf(nodes.map((node) => classificationOfBlock(node.codeBlocks[0]))) : null,
    unwrittenLabel: UNWRITTEN_LABEL,
    nodes: nodeViews,
    edges: traceDiagram.traceNodeEdges.flatMap((edge) => toEdgeViews(edge, stepsByEdgeId.get(edge.id) ?? [], nodeById, rowFindersByNodeId)),
  }
}

const TRACE_HEADING = "Trace Diagram"
const SCOPE_SEPARATOR = "-"

export const buildTrace = (segment: Segment, scope: string, places: readonly WaypointPlace[], context: ReviewViewContext): TraceBand => ({
  anchorId: `${scope}${TRACE_ANCHOR_NAME}`,
  heading: TRACE_HEADING,
  diagram: segment.traceDiagram === null
    ? null
    : toDiagram(segment.traceDiagram, segment.id, scope, { places, changedPaths: segment.changedPaths }, context),
  tabs: [],
})

const toTab = (segment: Segment & { readonly traceDiagram: TraceDiagram }, places: readonly WaypointPlace[], context: ReviewViewContext): TraceTabView => {
  const diagram = toDiagram(segment.traceDiagram, segment.id, `${segment.id}${SCOPE_SEPARATOR}`, { places, changedPaths: segment.changedPaths }, context)
  return { id: segment.id, label: diagram.title, diagram }
}

const hasTrace = (segment: Segment): segment is Segment & { readonly traceDiagram: TraceDiagram } => segment.traceDiagram !== null

const TABBED_MINIMUM = 2

export const buildTraceTabs = (segments: readonly Segment[], scope: string, places: readonly WaypointPlace[], context: ReviewViewContext): TraceBand => {
  const tabs = segments.filter(hasTrace).map((segment) => toTab(segment, places, context))
  const isTabbed = tabs.length >= TABBED_MINIMUM
  return {
    anchorId: `${scope}${TRACE_ANCHOR_NAME}`,
    heading: TRACE_HEADING,
    diagram: isTabbed ? null : tabs[0]?.diagram ?? null,
    tabs: isTabbed ? tabs : [],
  }
}
