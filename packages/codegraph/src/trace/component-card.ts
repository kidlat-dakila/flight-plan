import { hintOf } from "@/code-blocks/hints"
import type { ReviewViewContext } from "@/review-view-context"
import { firstOfEach } from "@/shared/first-of-each"
import { listComponentCardRows, type ComponentCardRows, type RenderGroup, type RenderRow } from "@/trace-diagram/component-card"
import { siteIdOf } from "@/trace-diagram/function-card"
import { memoCallOf } from "@/trace-diagram/hook-calls"
import { isNodeBlock } from "@/trace-diagram/node-blocks"
import type { CodeBlock, LineSpan, NodeChange, TraceNode, TraceRenderGroupView } from "@flightplan/configurations"
import { listComponentGroups } from "./cards/component"
import { isEmittedEvent, propTextOf, renderGroupNameOf, renderRowNameOf, stateTextOf } from "./component-code"
import { withDestructuredUnits } from "./destructured-units"
import {
  calleeCardsOf,
  callRowOf,
  lineSpansOf,
  listOf,
  withoutSource,
  siteRowFinder,
  sourceIn,
  sourceOf,
  writtenLabelsOf,
  type ChangeOfBlock,
  type FunctionCardView,
  type ListedRow,
  type RowFinder,
  type SourceOf,
} from "./function-card"
import { nameOfBlock } from "./names"

const CALL_SUFFIX = "()"
const ASSIGNMENT = " = "
const RENDER_GROUP_MARK = ":render:"

export const componentRowsOf = (node: TraceNode, sourceOfBlock: SourceOf = withoutSource): ComponentCardRows => {
  const [nodeBlock, ...insideBlocks] = node.codeBlocks
  const rows = listComponentCardRows(nodeBlock, insideBlocks)
  return { ...rows, calls: withDestructuredUnits(rows.calls, sourceOfBlock) }
}

const listBlocksWithin = (block: CodeBlock): CodeBlock[] => [block, ...block.childrenBlocks.flatMap(listBlocksWithin)]

const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const changeWithin = (block: CodeBlock): NodeChange | null => (listBlocksWithin(block).some(isChanged) ? "modified" : null)

const fixedRowOf = (id: string, name: string, block: CodeBlock): ListedRow =>
  ({ id, name, label: name, isDraft: false, hint: null, change: changeWithin(block), lines: lineSpansOf(block) })

const writtenRowOf = (id: string, name: string, block: CodeBlock, lines: LineSpan[], written: ReadonlyMap<string, string | null>): ListedRow => {
  const label = written.get(id) ?? null
  const change = changeWithin(block)
  return { id, name, label: label ?? name, isDraft: label === null, hint: label === null ? hintOf([block], change ?? "unchanged") : null, change, lines }
}

export const hookCallNameOf = (block: CodeBlock): string => {
  const call = memoCallOf(block)
  const called = `${call?.catalogue?.name ?? nameOfBlock(call ?? block)}${CALL_SUFFIX}`
  return call === null ? called : `${nameOfBlock(block)}${ASSIGNMENT}${called}`
}

const groupIdOf = (node: TraceNode, group: RenderGroup): string => `${node.id}${RENDER_GROUP_MARK}${siteIdOf(group.block, group.at)}`

const rowIdOf = (row: RenderRow): string => siteIdOf(row.block, row.at)

const returnLinesOf = ({ block, at, markup }: RenderGroup): LineSpan[] => {
  if (markup !== null) return at === null ? lineSpansOf(markup) : [[at.line, markup.lineOfCodeRangeReference[0].end.line]]
  return at === null ? lineSpansOf(block) : [[at.line, at.line]]
}

const renderLinesOf = (row: RenderRow): LineSpan[] => (row.at === null ? lineSpansOf(row.wrapper ?? row.block) : [[row.at.line, row.at.line]])

const renderRowsOf = (group: RenderGroup, written: ReadonlyMap<string, string | null>, context: ReviewViewContext): ListedRow[] => {
  const source = sourceOf(group.block, context)
  return [
    writtenRowOf(siteIdOf(group.block, group.at), renderGroupNameOf(group, source), group.markup ?? group.block, returnLinesOf(group), written),
    ...group.rows.map((row) => writtenRowOf(rowIdOf(row), renderRowNameOf(row, source), row.wrapper ?? row.block, renderLinesOf(row), written)),
  ]
}

const renderedChildIdOf = (row: RenderRow, childIds: ReadonlySet<string>): string | null =>
  row.kind !== "condition" && row.kind !== "loop" && row.rendered !== null && childIds.has(row.rendered.id) ? row.rendered.id : null

const rowIdByChildIdOf = (node: TraceNode, groups: readonly RenderGroup[]): ReadonlyMap<string, string> => {
  const childIds = new Set(node.children.map((child) => child.id))
  const held = groups.flatMap((group) => group.rows).flatMap((row) => {
    const childId = renderedChildIdOf(row, childIds)
    return childId === null ? [] : [{ childId, rowId: rowIdOf(row) }]
  })
  return new Map(firstOfEach(held, ({ childId }) => childId).map(({ childId, rowId }) => [childId, rowId] as const))
}

const toRenderGroupView = (node: TraceNode, group: RenderGroup, rowIdByChildId: ReadonlyMap<string, string>, context: ReviewViewContext): TraceRenderGroupView => ({
  id: groupIdOf(node, group),
  name: renderGroupNameOf(group, sourceOf(group.block, context)),
  rowId: siteIdOf(group.block, group.at),
  rows: group.rows.map((row) => {
    const rowId = rowIdOf(row)
    const childId = row.rendered?.id ?? ""
    return { rowId, kind: row.kind, childIds: rowIdByChildId.get(childId) === rowId ? [childId] : [] }
  }),
})

export const buildComponentCardView = (node: TraceNode, context: ReviewViewContext, changeOf: ChangeOfBlock): FunctionCardView => {
  const [nodeBlock] = node.codeBlocks
  const { props: declaredProps, states, calls, memos, effects, renderGroups } = componentRowsOf(node, sourceIn(context))
  const written = writtenLabelsOf(node)
  const source = sourceOf(nodeBlock, context)
  const props = declaredProps.filter((prop) => !isEmittedEvent(prop, nodeBlock, source))
  const rowIdByChildId = rowIdByChildIdOf(node, renderGroups)
  return {
    blockLists: [
      ...listOf("argument", props.map((prop) => fixedRowOf(prop.id, propTextOf(prop, nodeBlock, source), prop))),
      ...listOf("state", states.map((state) => fixedRowOf(state.id, stateTextOf(state, source), state))),
      ...listOf("call", calls.map((site) => callRowOf(site, written, context))),
      ...listOf("memo", memos.map((memo) => writtenRowOf(memo.id, hookCallNameOf(memo), memo, lineSpansOf(memo), written))),
      ...listOf("effect", effects.map((effect) => writtenRowOf(effect.id, hookCallNameOf(effect), effect, lineSpansOf(effect), written))),
      ...listOf("render", renderGroups.flatMap((group) => renderRowsOf(group, written, context))),
    ],
    rowGroups: listComponentGroups({
      propIds: props.map((prop) => prop.id),
      stateIds: states.map((state) => state.id),
      calleeCards: calleeCardsOf(node, calls, changeOf),
      memoIds: memos.map((memo) => memo.id),
      effectIds: effects.map((effect) => effect.id),
      triggerIds: node.triggerLabels.map(({ codeBlock }) => codeBlock.id),
      renderGroups: renderGroups.map((group) => toRenderGroupView(node, group, rowIdByChildId, context)),
      otherChildIds: node.children.filter((child) => !rowIdByChildId.has(child.id)).map((child) => child.id),
    }),
  }
}

export const componentRowFinder = (node: TraceNode, sourceOfBlock: SourceOf): RowFinder => {
  const { props, calls, memos, effects, renderGroups } = componentRowsOf(node, sourceOfBlock)
  const componentRows = renderGroups.flatMap((group) => group.rows).filter((row) => row.kind === "component")
  const heldIds = [...memos, ...effects, ...node.triggerLabels.map(({ codeBlock }) => codeBlock)].map((block) => block.id)
  const [nodeBlock] = node.codeBlocks
  const heldCalls = calls.filter((site) => site.block.id !== nodeBlock.id && isNodeBlock(site.block))
  const fromRowIds = new Map([
    ...[...props.map((prop) => prop.id), ...heldIds].map((id) => [id, id] as const),
    ...componentRows.map((row) => [row.block.id, rowIdOf(row)] as const),
    ...heldCalls.map((site) => [site.block.id, siteIdOf(site.block, site.at)] as const),
  ])
  return siteRowFinder(nodeBlock, { calls, parameters: props, fromRowIds, toRowIds: new Map() })
}
