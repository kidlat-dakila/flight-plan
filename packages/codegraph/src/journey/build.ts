import { findSource, rowSpanOf } from "@/code/lines"
import { codeLinkIdOf } from "@/code/links"
import { listJourneyNodes } from "@/journey-flow-diagram"
import { linesLabelOf } from "@/journey-flow-diagram/cards"
import { listListedBlocks, type ListedBlock } from "@/journey-flow-diagram/listed-blocks"
import { eventHandedTo, isFoldedValue, isHandlerBlock, listNodeSteps, nodeBlockAround, type NodeStep } from "@/journey-flow-diagram/node-blocks"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import type { WaypointPlace } from "@/walkthrough/build"
import type {
  CodeBlock,
  CodeBlockType,
  JourneyBand,
  JourneyBlockListView,
  JourneyEdgeView,
  JourneyFlowDiagram,
  JourneyNode,
  JourneyNodeEdge,
  JourneyNodeView,
  JourneyRow,
  JourneyRowGroupView,
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
type RowIdByBlockId = ReadonlyMap<string, string>

const NO_ROW_IDS: RowIdByBlockId = new Map()
const LIST_KEY_SEPARATOR = ":"
const BLOCK_LIST_LABELS: Readonly<Record<NodeBlockListKind, string>> = { argument: "Args", state: "State", hook: "Hooks", effect: "Effects", call: "Calls", step: "Steps" }
const KINDS_BEFORE_CALLS: readonly NodeBlockListKind[] = ["argument", "state", "hook", "effect"]
const BLOCK_LIST_KINDS: readonly NodeBlockListKind[] = [...KINDS_BEFORE_CALLS, "call", "step"]
const ARGUMENT: NodeBlockListKind = "argument"
const EXTERNAL_CALL: NodeBlockListKind = "call"
const STEP: NodeBlockListKind = "step"
const GROUPED_TYPE: CodeBlockType = "component"
const PLAIN_CALL_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["external-value", "call"])
const TRIGGERS_LABEL = "Triggers"
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

const changeOfNode = ({ codeBlocks: [root], diffCodeBlocks }: JourneyNode, context: ReviewViewContext): NodeChange | null => {
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
    lines: linesWithHandlers(codeBlock),
  }
}

const rowIdAround = (block: CodeBlock, rowIdByBlockId: RowIdByBlockId): string | null => {
  const rowId = rowIdByBlockId.get(block.id)
  if (rowId !== undefined) return rowId
  return block.parentBlock === null ? null : rowIdAround(block.parentBlock, rowIdByBlockId)
}

const listRows = ({ codeBlocks: [nodeBlock, ...insideBlocks] }: JourneyNode): ListedBlock[] => listListedBlocks(nodeBlock, insideBlocks)

const rowIdByBlockIdOf = (node: JourneyNode): RowIdByBlockId =>
  node.rows === undefined
    ? new Map([
        ...listRows(node).flatMap(({ block, statements }) => statements.map((statement) => [statement.id, block.id] as const)),
        ...node.triggerLabels.map(({ codeBlock }) => [codeBlock.id, codeBlock.id] as const),
      ])
    : new Map(node.rows.map((row) => [row.id, row.id] as const))

const inRowOrder = (rows: readonly JourneyRow[]): JourneyRow[] =>
  [...rows].sort((one, two) => one.lineStart - two.lineStart || one.lineEnd - two.lineEnd)

const toStoredRowView = (row: JourneyRow, node: JourneyNode): JourneyTriggerLabelView => {
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

const groupStoredRows = (rows: readonly JourneyRow[]): JourneyRowGroupView[] =>
  rows.length === 0 ? [] : [{ label: null, rowIds: rows.map((row) => row.id) }]

const linesOfRow = ({ statements }: ListedBlock): LineSpan[] => {
  const spans = statements.flatMap(lineSpansOf)
  if (statements.length === 1) return spans
  return [[Math.min(...spans.map(([lineStart]) => lineStart)), Math.max(...spans.map(([, lineEnd]) => lineEnd))]]
}

const labelOfRow = ({ kind, block }: ListedBlock): string =>
  kind === EXTERNAL_CALL && !PLAIN_CALL_TYPES.has(block.type) ? BLOCK_TYPE_LABELS[block.type] : BLOCK_LIST_LABELS[kind]

const toBlockLists = (node: JourneyNode, rows: readonly ListedBlock[]): JourneyBlockListView[] => {
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

const positionOf = (block: CodeBlock): readonly [number, number] => {
  const { line, column } = block.lineOfCodeRangeReference[0].start
  return [line, column]
}

const inWrittenOrder = (blocks: readonly CodeBlock[]): CodeBlock[] =>
  [...blocks].sort((one, two) => positionOf(one)[0] - positionOf(two)[0] || positionOf(one)[1] - positionOf(two)[1])

const idsOf = (rows: readonly ListedBlock[]): string[] => rows.map(({ block }) => block.id)

const listGroupsOfComponent = (rows: readonly ListedBlock[], triggers: readonly TriggerLabel[]): JourneyRowGroupView[] => {
  const ofKind = (kind: NodeBlockListKind): ListedBlock[] => rows.filter((row) => row.kind === kind)
  const calls = ofKind(EXTERNAL_CALL)
  const groups: JourneyRowGroupView[] = [
    ...KINDS_BEFORE_CALLS.map((kind) => ({ label: BLOCK_LIST_LABELS[kind], rowIds: idsOf(ofKind(kind)) })),
    ...[...new Set(calls.map(labelOfRow))].map((label) => ({ label, rowIds: idsOf(calls.filter((row) => labelOfRow(row) === label)) })),
    { label: TRIGGERS_LABEL, rowIds: triggers.map(({ codeBlock }) => codeBlock.id) },
    { label: BLOCK_LIST_LABELS[STEP], rowIds: idsOf(ofKind(STEP)) },
  ].filter(({ rowIds }) => rowIds.length > 0)
  return groups.length === 1 && groups[0].label === TRIGGERS_LABEL ? [{ ...groups[0], label: null }] : groups
}

const listRowsInOrder = (rows: readonly ListedBlock[], triggers: readonly TriggerLabel[]): JourneyRowGroupView[] => {
  const isArgument = (row: ListedBlock): boolean => row.kind === ARGUMENT
  const following = inWrittenOrder([...rows.filter((row) => !isArgument(row)).map(({ block }) => block), ...triggers.map(({ codeBlock }) => codeBlock)])
  const rowIds = [...idsOf(rows.filter(isArgument)), ...following.map((block) => block.id)]
  return rowIds.length === 0 ? [] : [{ label: null, rowIds }]
}

const toRowGroups = (node: JourneyNode, rows: readonly ListedBlock[]): JourneyRowGroupView[] =>
  node.type === GROUPED_TYPE ? listGroupsOfComponent(rows, node.triggerLabels) : listRowsInOrder(rows, node.triggerLabels)

const codeLinesOf = ({ codeBlocks: [root, ...insideBlocks] }: JourneyNode): LineSpan[] =>
  inLineOrder([root, ...insideBlocks.filter((block) => eventHandedTo(block)?.id === root.id || isFoldedValue(block))].flatMap(lineSpansOf))

const toNodeView = (node: JourneyNode, setting: CodeViewSetting, context: ReviewViewContext): JourneyNodeView => {
  const [root] = node.codeBlocks
  const path = filePathOf(root)
  const name = nameOfBlock(root)
  const change = changeOfNode(node, context)
  const linkId = codeLinkIdOf(path, name)
  const storedRows = node.rows === undefined ? null : inRowOrder(node.rows)
  const rows = storedRows === null ? listRows(node) : []
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
    codeViews: buildNodeCodeViews(node.id, { path, lines: codeLinesOf(node) }, setting, context),
    blockLists: storedRows === null ? toBlockLists(node, rows) : [],
    triggerLabels: storedRows === null ? node.triggerLabels.map(toTriggerLabelView) : storedRows.map((row) => toStoredRowView(row, node)),
    rowGroups: storedRows === null ? toRowGroups(node, rows) : groupStoredRows(storedRows),
    position: node.position ?? null,
    children: node.children.map((child) => toNodeView(child, setting, context)),
  }
}

const edgeIdOf = (from: string, to: string): string => [from, to].join(EDGE_END_SEPARATOR)

const toEdgeView = ({ from, to }: JourneyNodeEdge, fromRowId: string | null, toRowId: string | null): JourneyEdgeView => ({
  id: edgeIdOf(fromRowId ?? from, toRowId ?? to),
  from,
  to,
  fromRowId,
  toRowId,
  toSide: DEFAULT_SIDE,
})

const isDrawnByAuthor = (edge: JourneyNodeEdge): boolean => edge.fromRowId !== undefined || edge.toSide !== undefined

const toAuthorEdgeView = ({ id, from, to, fromRowId, toSide }: JourneyNodeEdge): JourneyEdgeView => ({
  id,
  from,
  to,
  fromRowId: fromRowId ?? null,
  toRowId: null,
  toSide: toSide ?? DEFAULT_SIDE,
})

const listDiagramSteps = (nodes: readonly JourneyNode[]): NodeStep[] => {
  const blocks = firstOfEach(nodes.flatMap((node) => node.codeBlocks), (block) => block.id)
  const blockIds = new Set(blocks.map((block) => block.id))
  return listNodeSteps(blocks, (block) => block.nextBlocks.filter((next) => blockIds.has(next.id)))
}

const toEdgeViews = (edge: JourneyNodeEdge, steps: readonly NodeStep[], nodeById: ReadonlyMap<string, JourneyNode>, rowIdsByNodeId: ReadonlyMap<string, RowIdByBlockId>): JourneyEdgeView[] => {
  if (isDrawnByAuthor(edge)) return [toAuthorEdgeView(edge)]
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
  const rowIdsByNodeId = new Map(nodes.map((node) => [node.id, rowIdByBlockIdOf(node)] as const))
  const stepsByEdgeId = groupBy(listDiagramSteps(nodes), (step) => edgeIdOf(step.from.id, step.to.id))
  return {
    anchorId: `${scope}journey-${segmentId}`,
    title: nodes.length === 0 ? EMPTY_TITLE : titleOf(nodes),
    description: journey.description === null ? null : parseProse(journey.description, context.knownLinkIds),
    descriptionMarkdown: journey.description ?? UNWRITTEN_MARKDOWN,
    unwrittenLabel: UNWRITTEN_LABEL,
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
