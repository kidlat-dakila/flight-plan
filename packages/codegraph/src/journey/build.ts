import { findSource, rowSpanOf } from "@/code/lines"
import { codeLinkIdOf } from "@/code/links"
import { listJourneyNodes } from "@/journey-flow-diagram"
import { countLabel } from "@/prose/count-label"
import { parseProse } from "@/prose/parse-prose"
import type { ReviewViewContext } from "@/review-view-context"
import { firstOfEach } from "@/shared/first-of-each"
import type { WaypointPlace } from "@/walkthrough/build"
import type {
  CodeBlock,
  CodeBlockSymbol,
  CodeBlockType,
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
const SUBLABEL_SEPARATOR = " · "
const TITLE_SEPARATOR = ", "
const EDGE_END_SEPARATOR = " -> "
const TITLED_NODE_COUNT = 3
const HOOK_NAME_PATTERN = /^use[A-Z]/
const KEPT_VALUE: CodeBlockType = "external-value"
const CALL: CodeBlockSymbol["use"] = "call"
const NO_ROW_IDS: ReadonlySet<string> = new Set()
const BLOCK_LIST_KINDS: readonly NodeBlockListKind[] = ["argument", "state", "hook", "effect"]
const BLOCK_LIST_LABELS: Readonly<Record<NodeBlockListKind, string>> = { argument: "Args", state: "State", hook: "Hooks", effect: "Effects" }
const BLOCK_LIST_KIND_BY_TYPE: ReadonlyMap<CodeBlockType, NodeBlockListKind> = new Map<CodeBlockType, NodeBlockListKind>([
  ["root-argument-value", "argument"],
  ["state", "state"],
  ["derived", "state"],
  ["effect", "effect"],
  ["component-effect", "effect"],
  ["effect-callback", "effect"],
])

interface ListedBlock {
  readonly kind: NodeBlockListKind
  readonly block: CodeBlock
  readonly name: string
}

const filePathOf = (block: CodeBlock): string => block.astGraph.filePath

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

const changeOfBlock = (block: CodeBlock): NodeChange | null => (block.lineOfCodeDiffs === null ? null : "modified")

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
  }
}

const calledNameOf = (symbol: CodeBlockSymbol): string | null => {
  if (symbol.use !== CALL) return null
  if (symbol.type === "unopened-import") return symbol.importedName
  return symbol.type === "internal-code-block" || symbol.type === "external-block" ? (symbol.codeBlockReference.name ?? null) : null
}

const calledNamesOf = (block: CodeBlock): string[] => block.outerSymbols.flatMap((symbol) => calledNameOf(symbol) ?? [])

const hookNameOf = (block: CodeBlock): string | null => calledNamesOf(block).find((name) => HOOK_NAME_PATTERN.test(name)) ?? null

const effectNameOf = (block: CodeBlock): string => {
  const calledNames = calledNamesOf(block)
  return block.name === undefined && calledNames.length > 0 ? calledNames[0] : nameOfBlock(block)
}

const stateAround = (block: CodeBlock): CodeBlock | null => {
  if (block.parentBlock === null) return null
  return BLOCK_LIST_KIND_BY_TYPE.get(block.parentBlock.type) === "state" && !block.parentBlock.isRoot ? block.parentBlock : stateAround(block.parentBlock)
}

const toListedBlock = (block: CodeBlock): ListedBlock[] => {
  const kind = BLOCK_LIST_KIND_BY_TYPE.get(block.type)
  const state = kind === "effect" ? stateAround(block) : null
  if (state !== null) return [{ kind: "state", block: state, name: nameOfBlock(state) }]
  if (kind !== undefined) return [{ kind, block, name: kind === "effect" ? effectNameOf(block) : nameOfBlock(block) }]
  const hookName = block.type === KEPT_VALUE ? hookNameOf(block) : null
  return hookName === null ? [] : [{ kind: "hook", block, name: hookName }]
}

const isInside = (block: CodeBlock, holderIds: ReadonlySet<string>): boolean =>
  block.parentBlock !== null && (holderIds.has(block.parentBlock.id) || isInside(block.parentBlock, holderIds))

const toBlockLists = ({ codeBlocks: [, ...insideBlocks] }: JourneyNode): JourneyBlockListView[] => {
  const listed = firstOfEach(insideBlocks.flatMap(toListedBlock), ({ block }) => block.id)
  const listedIds = new Set(listed.map(({ block }) => block.id))
  const outermost = listed.filter(({ block }) => !isInside(block, listedIds))
  return BLOCK_LIST_KINDS.flatMap((kind) => {
    const blocks = outermost.filter((one) => one.kind === kind).map(({ block, name }) => ({ id: block.id, name, change: changeOfBlock(block) }))
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
    sublabel: node.label === null ? path : [name, path].join(SUBLABEL_SEPARATOR),
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

const toEdgeView = ({ from, to }: JourneyNodeEdge, fromRowId: string | null, toRowId: string | null): JourneyEdgeView => ({
  id: [fromRowId ?? from, toRowId ?? to].join(EDGE_END_SEPARATOR),
  from,
  to,
  fromRowId,
  toRowId,
})

const toEdgeViews = (edge: JourneyNodeEdge, nodeById: ReadonlyMap<string, JourneyNode>, rowIdsByNodeId: ReadonlyMap<string, ReadonlySet<string>>): JourneyEdgeView[] => {
  const fromRowIds = rowIdsByNodeId.get(edge.from) ?? NO_ROW_IDS
  const toRowIds = rowIdsByNodeId.get(edge.to) ?? NO_ROW_IDS
  const arrivedAtIds = new Set((nodeById.get(edge.to)?.codeBlocks ?? []).map((block) => block.id))
  const stepped = (nodeById.get(edge.from)?.codeBlocks ?? []).flatMap((block) =>
    block.nextBlocks.filter((next) => arrivedAtIds.has(next.id)).map((next) => toEdgeView(edge, rowIdAround(block, fromRowIds), rowIdAround(next, toRowIds))))
  return stepped.length === 0 ? [toEdgeView(edge, null, null)] : firstOfEach(stepped, (view) => view.id)
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
  return {
    anchorId: `${scope}journey-${segmentId}`,
    title: titleOf(nodes),
    summaryLabel: countLabel(nodes.length, "node", "nodes"),
    nodes: nodeViews,
    edges: journey.journeyNodeEdges.flatMap((edge) => toEdgeViews(edge, nodeById, rowIdsByNodeId)),
  }
}

export const buildJourney = (segment: Segment, scope: string, places: readonly WaypointPlace[], context: ReviewViewContext): JourneyBand => ({
  anchorId: `${scope}${JOURNEY_ANCHOR_NAME}`,
  heading: "Journey Flow Diagram",
  diagram: segment.journey === null
    ? null
    : toDiagram(segment.journey, segment.id, scope, { places, changedPaths: segment.changedPaths }, context),
})
