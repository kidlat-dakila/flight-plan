import { unresolvedLinkIdsIn } from "@/procedures/update-nodes/utils/written-links"
import {
  buildBlockCard,
  buildLinesCard,
  createEmptyTrace,
  linesCardIdOf,
  listCardRows,
  listTraceNodes,
  readFileGraph,
  sourceFileOf,
} from "@flightplan/codegraph"
import type { ASTGraph, TraceDiagram, TraceNode, TraceNodeEdge, TraceRow, ReviewArtifact, Segment } from "@flightplan/configurations"
import type { CardPlace, CardRowEdit, DiagramEdit, LineEnd } from "./schemas"

export type PlannedDiagramEdit
  = | { readonly kind: "planned", readonly artifact: ReviewArtifact, readonly nodeId: string | null }
    | { readonly kind: "rejected", readonly message: string }

type EditOf<Kind extends DiagramEdit["kind"]> = Extract<DiagramEdit, { readonly kind: Kind }>

interface Drawing {
  readonly artifact: ReviewArtifact
  readonly segment: Segment
  readonly traceDiagram: TraceDiagram
}

const MISSING_SEGMENT_MESSAGE = "This segment is no longer in the Flight Plan."
const HELD_DIAGRAM_MESSAGE = "This segment already has a Trace Diagram."
const NO_DIAGRAM_MESSAGE = "This segment has no Trace Diagram."
const MISSING_CARD_MESSAGE = "This card is no longer on the diagram."
const NESTED_CARD_MESSAGE = "A card inside another card moves with the card around it."
const SAME_CARD_MESSAGE = "A line joins two different cards."
const NESTED_LINE_MESSAGE = "A line cannot join a card to a card inside it."
const MISSING_ROW_MESSAGE = "This row is no longer on its card."
const HELD_LINE_MESSAGE = "These two are already joined by a line."
const MISSING_LINE_MESSAGE = "This line is no longer on the diagram."
const UNREADABLE_FILE_MESSAGE = "This file could not be read at the commit of the Flight Plan."
const MISSING_BLOCK_MESSAGE = "This code block is no longer in the file."
const HELD_CARD_MESSAGE = "This code already has a card on the diagram."
const LINES_OUTSIDE_FILE_MESSAGE = "These lines are not in the file."
const BACKWARDS_LINES_MESSAGE = "The first line of a row cannot come after its last line."
const EMPTY_DESCRIPTION_MESSAGE = "Write the description. It tells the diagram in words."
const NEW_CARD_SIDE = "left"
const EDGE_END_SEPARATOR = " -> "
const ROW_ID_SEPARATOR = "#row@"
const LINE_BREAK = "\n"

const reject = (message: string): PlannedDiagramEdit => ({ kind: "rejected", message })

const plan = ({ artifact, segment }: Drawing, traceDiagram: TraceDiagram | null, nodeId: string | null = null): PlannedDiagramEdit => ({
  kind: "planned",
  nodeId,
  artifact: {
    ...artifact,
    segments: artifact.segments.map((other) => (other.id === segment.id ? { ...other, traceDiagram } : other)),
  },
})

const unresolvedLinksMessage = (linkIds: readonly string[]): string =>
  `${linkIds.length === 1 ? "This code link points" : "These code links point"} at code the Flight Plan does not hold: ${linkIds.join(", ")}.`

const mapNodes = (nodes: readonly TraceNode[], change: (node: TraceNode) => TraceNode): TraceNode[] =>
  nodes.map((node) => change({ ...node, children: mapNodes(node.children, change) }))

const withoutNodes = (nodes: readonly TraceNode[], removedIds: ReadonlySet<string>): TraceNode[] =>
  nodes.filter((node) => !removedIds.has(node.id)).map((node) => ({ ...node, children: withoutNodes(node.children, removedIds) }))

const idsWithin = (node: TraceNode): string[] => listTraceNodes([node]).map((inside) => inside.id)

const roundedPosition = ({ x, y }: { readonly x: number, readonly y: number }): { readonly x: number, readonly y: number } => ({ x: Math.round(x), y: Math.round(y) })

const placeCards = (topNodes: readonly TraceNode[], places: readonly CardPlace[]): TraceNode[] => {
  const placeById = new Map(places.map((place) => [place.nodeId, place] as const))
  return topNodes.map((node) => {
    const place = placeById.get(node.id)
    return place === undefined ? node : { ...node, position: roundedPosition(place) }
  })
}

const planCardMoves = (drawing: Drawing, places: readonly CardPlace[]): PlannedDiagramEdit => {
  const { traceDiagram } = drawing
  const topIds = new Set(traceDiagram.traceNodes.map((node) => node.id))
  const knownIds = new Set(listTraceNodes(traceDiagram.traceNodes).map((node) => node.id))
  if (places.some((place) => !knownIds.has(place.nodeId))) return reject(MISSING_CARD_MESSAGE)
  if (places.some((place) => !topIds.has(place.nodeId))) return reject(NESTED_CARD_MESSAGE)
  return plan(drawing, { ...traceDiagram, traceNodes: placeCards(traceDiagram.traceNodes, places) })
}

const lineIdOf = ({ from, fromRowId, to, toSide }: Omit<EditOf<"add-line">, "kind">): string =>
  [`${from}#${fromRowId}`, `${to}@${toSide}`].join(EDGE_END_SEPARATOR)

const planLine = (drawing: Drawing, edit: EditOf<"add-line">): PlannedDiagramEdit => {
  const { traceDiagram } = drawing
  const nodes = listTraceNodes(traceDiagram.traceNodes)
  const from = nodes.find((node) => node.id === edit.from)
  const to = nodes.find((node) => node.id === edit.to)
  if (from === undefined || to === undefined) return reject(MISSING_CARD_MESSAGE)
  if (from.id === to.id) return reject(SAME_CARD_MESSAGE)
  if (idsWithin(from).includes(to.id) || idsWithin(to).includes(from.id)) return reject(NESTED_LINE_MESSAGE)
  if (!listCardRows(from).some((row) => row.id === edit.fromRowId)) return reject(MISSING_ROW_MESSAGE)
  const line: TraceNodeEdge = { id: lineIdOf(edit), from: from.id, to: to.id, fromRowId: edit.fromRowId, toSide: edit.toSide }
  if (traceDiagram.traceNodeEdges.some((edge) => edge.id === line.id)) return reject(HELD_LINE_MESSAGE)
  return plan(drawing, { ...traceDiagram, traceNodeEdges: [...traceDiagram.traceNodeEdges, line] })
}

const planLineRemoval = (drawing: Drawing, { edgeId, from, to }: EditOf<"remove-line">): PlannedDiagramEdit => {
  const { traceDiagram } = drawing
  const isDrawn = traceDiagram.traceNodeEdges.some((edge) => edge.id === edgeId)
  const isRemoved = (edge: TraceNodeEdge): boolean =>
    isDrawn ? edge.id === edgeId : edge.from === from && edge.to === to && edge.fromRowId === undefined && edge.toSide === undefined
  const kept = traceDiagram.traceNodeEdges.filter((edge) => !isRemoved(edge))
  return kept.length === traceDiagram.traceNodeEdges.length ? reject(MISSING_LINE_MESSAGE) : plan(drawing, { ...traceDiagram, traceNodeEdges: kept })
}

const reachFrom = (pendingIds: readonly string[], traceDiagram: TraceDiagram, reachedIds: ReadonlySet<string>): ReadonlySet<string> => {
  const arrivingIds = [...new Set(pendingIds)].filter((nodeId) => !reachedIds.has(nodeId))
  if (arrivingIds.length === 0) return reachedIds
  const nodes = listTraceNodes(traceDiagram.traceNodes)
  const heldIds = arrivingIds.flatMap((nodeId) => nodes.filter((node) => node.id === nodeId).flatMap(idsWithin))
  const leadingIds = new Set([...arrivingIds, ...heldIds])
  const nextIds = traceDiagram.traceNodeEdges.filter((edge) => leadingIds.has(edge.from)).map((edge) => edge.to)
  return reachFrom([...heldIds, ...nextIds], traceDiagram, new Set([...reachedIds, ...arrivingIds]))
}

const planCardRemoval = (drawing: Drawing, nodeId: string): PlannedDiagramEdit => {
  const { traceDiagram } = drawing
  if (!listTraceNodes(traceDiagram.traceNodes).some((node) => node.id === nodeId)) return reject(MISSING_CARD_MESSAGE)
  const removedIds = reachFrom([nodeId], traceDiagram, new Set())
  return plan(drawing, {
    ...traceDiagram,
    traceNodes: withoutNodes(traceDiagram.traceNodes, removedIds),
    traceNodeEdges: traceDiagram.traceNodeEdges.filter((edge) => !removedIds.has(edge.from) && !removedIds.has(edge.to)),
  })
}

const graphOf = (traceDiagram: TraceDiagram, path: string, text: string): ASTGraph | null =>
  traceDiagram.astCodeGroup.astGraphs.find((astGraph) => astGraph.filePath === path) ?? readFileGraph(path, text)

const lineCountOf = (text: string): number => {
  const lines = text.split(LINE_BREAK)
  return text.endsWith(LINE_BREAK) ? lines.length - 1 : lines.length
}

const buildCard = (astGraph: ASTGraph, edit: EditOf<"add-card">, heldCardIds: ReadonlySet<string>, text: string): TraceNode | string => {
  if (edit.source.kind === "lines") {
    const { lineStart, lineEnd } = edit.source
    if (lineStart > lineEnd) return BACKWARDS_LINES_MESSAGE
    if (lineEnd > lineCountOf(text)) return LINES_OUTSIDE_FILE_MESSAGE
    return heldCardIds.has(linesCardIdOf(astGraph.filePath, edit.source)) ? HELD_CARD_MESSAGE : buildLinesCard(astGraph, edit.source, edit.isPrefilled)
  }
  const { blockId } = edit.source
  const block = astGraph.rootBlocks.find((root) => root.id === blockId)
  if (block === undefined) return MISSING_BLOCK_MESSAGE
  if (heldCardIds.has(block.id)) return HELD_CARD_MESSAGE
  return buildBlockCard(block, { isPrefilled: edit.isPrefilled, hasChildComponents: edit.hasChildComponents, heldCardIds })
}

const lineEndProblemOf = (traceDiagram: TraceDiagram, { from, fromRowId }: LineEnd): string | null => {
  const card = listTraceNodes(traceDiagram.traceNodes).find((node) => node.id === from)
  if (card === undefined) return MISSING_CARD_MESSAGE
  return listCardRows(card).some((row) => row.id === fromRowId) ? null : MISSING_ROW_MESSAGE
}

const joinCardToLine = (traceDiagram: TraceDiagram, card: TraceNode, { from, fromRowId, position, places }: LineEnd): TraceDiagram => {
  const line = { from, fromRowId, to: card.id, toSide: NEW_CARD_SIDE } as const
  return {
    ...traceDiagram,
    traceNodes: [...placeCards(traceDiagram.traceNodes, places), { ...card, position: roundedPosition(position) }],
    traceNodeEdges: [...traceDiagram.traceNodeEdges, { id: lineIdOf(line), ...line }],
  }
}

const planCard = (drawing: Drawing, edit: EditOf<"add-card">, text: string | null): PlannedDiagramEdit => {
  const { artifact, traceDiagram } = drawing
  if (text === null) return reject(UNREADABLE_FILE_MESSAGE)
  const astGraph = graphOf(traceDiagram, edit.path, text)
  if (astGraph === null) return reject(UNREADABLE_FILE_MESSAGE)
  const heldCardIds = new Set(listTraceNodes(traceDiagram.traceNodes).map((node) => node.id))
  const card = buildCard(astGraph, edit, heldCardIds, text)
  if (typeof card === "string") return reject(card)
  const lineProblem = edit.lineEnd === undefined ? null : lineEndProblemOf(traceDiagram, edit.lineEnd)
  if (lineProblem !== null) return reject(lineProblem)
  const isHeldSource = artifact.sources.some((source) => source.path === edit.path)
  const withSource: ReviewArtifact = isHeldSource ? artifact : { ...artifact, sources: [...artifact.sources, sourceFileOf(edit.path, text)] }
  const withCard = edit.lineEnd === undefined
    ? { ...traceDiagram, traceNodes: [...traceDiagram.traceNodes, card] }
    : joinCardToLine(traceDiagram, card, edit.lineEnd)
  return plan({ ...drawing, artifact: withSource }, withCard, card.id)
}

const rowIdOf = (nodeId: string, { lineStart, lineEnd }: CardRowEdit, takenIds: readonly string[]): string => {
  const rowId = `${nodeId}${ROW_ID_SEPARATOR}${String(lineStart)}:${String(lineEnd)}`
  const sameCount = takenIds.filter((takenId) => takenId === rowId || takenId.startsWith(`${rowId}/`)).length
  return sameCount === 0 ? rowId : `${rowId}/${String(sameCount + 1)}`
}

const inLineOrder = (rows: readonly TraceRow[]): TraceRow[] =>
  [...rows].sort((one, two) => one.lineStart - two.lineStart || one.lineEnd - two.lineEnd)

const toRows = (nodeId: string, edits: readonly CardRowEdit[]): TraceRow[] =>
  inLineOrder(
    edits.reduce<readonly TraceRow[]>((rows, edit) => {
      const takenIds = rows.map((row) => row.id)
      const id = edit.id === null || takenIds.includes(edit.id) ? rowIdOf(nodeId, edit, takenIds) : edit.id
      const label = edit.label.trim()
      return [...rows, { id, type: edit.type, label: label === "" ? null : label, lineStart: edit.lineStart, lineEnd: edit.lineEnd }]
    }, []),
  )

const planCardChange = (drawing: Drawing, edit: EditOf<"change-card">): PlannedDiagramEdit => {
  const { artifact, traceDiagram } = drawing
  if (!listTraceNodes(traceDiagram.traceNodes).some((node) => node.id === edit.nodeId)) return reject(MISSING_CARD_MESSAGE)
  if (edit.rows.some((row) => row.lineStart > row.lineEnd)) return reject(BACKWARDS_LINES_MESSAGE)
  const label = edit.label.trim()
  const description = edit.description.trim()
  const unresolvedLinkIds = unresolvedLinkIdsIn([description], artifact.sources)
  if (unresolvedLinkIds.length > 0) return reject(unresolvedLinksMessage(unresolvedLinkIds))
  const rows = toRows(edit.nodeId, edit.rows)
  const rowIds = new Set(rows.map((row) => row.id))
  const changed = mapNodes(traceDiagram.traceNodes, (node) =>
    node.id === edit.nodeId
      ? { ...node, label: label === "" ? null : label, description: description === "" ? null : description, rows }
      : node)
  const isCutOff = (edge: TraceNodeEdge): boolean => edge.from === edit.nodeId && edge.fromRowId !== undefined && !rowIds.has(edge.fromRowId)
  return plan(drawing, { ...traceDiagram, traceNodes: changed, traceNodeEdges: traceDiagram.traceNodeEdges.filter((edge) => !isCutOff(edge)) }, edit.nodeId)
}

const planDescription = (drawing: Drawing, written: string): PlannedDiagramEdit => {
  const description = written.trim()
  if (description === "") return reject(EMPTY_DESCRIPTION_MESSAGE)
  const unresolvedLinkIds = unresolvedLinkIdsIn([description], drawing.artifact.sources)
  if (unresolvedLinkIds.length > 0) return reject(unresolvedLinksMessage(unresolvedLinkIds))
  return plan(drawing, { ...drawing.traceDiagram, description })
}

const planOnDiagram = (drawing: Drawing, edit: Exclude<DiagramEdit, { readonly kind: "add-diagram" }>, cardText: string | null): PlannedDiagramEdit => {
  if (edit.kind === "remove-diagram") return plan(drawing, null)
  if (edit.kind === "clear-diagram") return plan(drawing, createEmptyTrace())
  if (edit.kind === "describe") return planDescription(drawing, edit.description)
  if (edit.kind === "move-cards") return planCardMoves(drawing, edit.places)
  if (edit.kind === "add-line") return planLine(drawing, edit)
  if (edit.kind === "remove-line") return planLineRemoval(drawing, edit)
  if (edit.kind === "remove-card") return planCardRemoval(drawing, edit.nodeId)
  if (edit.kind === "add-card") return planCard(drawing, edit, cardText)
  return planCardChange(drawing, edit)
}

export const planDiagramEdit = (artifact: ReviewArtifact, segmentId: string, edit: DiagramEdit, cardText: string | null): PlannedDiagramEdit => {
  const segment = artifact.segments.find((candidate) => candidate.id === segmentId)
  if (segment === undefined) return reject(MISSING_SEGMENT_MESSAGE)
  if (edit.kind === "add-diagram") {
    return segment.traceDiagram === null ? plan({ artifact, segment, traceDiagram: createEmptyTrace() }, createEmptyTrace()) : reject(HELD_DIAGRAM_MESSAGE)
  }
  return segment.traceDiagram === null ? reject(NO_DIAGRAM_MESSAGE) : planOnDiagram({ artifact, segment, traceDiagram: segment.traceDiagram }, edit, cardText)
}
