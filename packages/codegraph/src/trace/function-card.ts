import { findSource } from "@/code/lines"
import { hintOf } from "@/code-blocks/hints"
import type { ReviewViewContext } from "@/review-view-context"
import { groupBy } from "@/shared/group-by"
import { isBareName, lastKeyOf, listFunctionCardRows, siteIdOf, type CallSite, type ExitSite, type FunctionCardRows } from "@/trace-diagram/function-card"
import { isWithin } from "@/trace-diagram/step-folding"
import type {
  CodeBlock,
  LineSpan,
  NodeBlockListKind,
  NodeChange,
  Position,
  SourceFile,
  TraceBlockListView,
  TraceCalleeCardView,
  TraceNode,
  TraceRowGroupView,
} from "@flightplan/configurations"
import { BLOCK_LIST_LABELS } from "./cards"
import { BLOCK_TYPE_LABELS, nameOfBlock } from "./names"
import { parameterTextOf, textAt } from "./parameters"

type ListedRow = TraceBlockListView["blocks"][number]

export interface RowFinder {
  readonly fromRowOf: (block: CodeBlock, toBlock: CodeBlock | null) => string | null
  readonly toRowOf: (block: CodeBlock) => string | null
}

export interface FunctionCardView {
  readonly blockLists: TraceBlockListView[]
  readonly rowGroups: TraceRowGroupView[]
}

export type ChangeOfBlock = (block: CodeBlock) => NodeChange | null

export const CHANGE_LABELS: Readonly<Record<NodeChange, string>> = { added: "Added", modified: "Modified" }

const ARGUMENTS_LABEL = "Arguments"
const CALLS_LABEL = "External calls"
const TRIGGERS_LABEL = "Triggers"
const EXITS_LABEL = "Returns and raises"
const CALLEE_MARK = ":callee:"
const CALL_SUFFIX = "()"
const RETURN_NAME = "return"
const ARGUMENT: NodeBlockListKind = "argument"
const CALL: NodeBlockListKind = "call"
const ROOT_ARGUMENT = "root-argument-value"

export const rowsOfNode = (node: TraceNode): FunctionCardRows => {
  const [nodeBlock, ...insideBlocks] = node.codeBlocks
  return listFunctionCardRows(nodeBlock, insideBlocks)
}

const sourceOf = (block: CodeBlock, context: ReviewViewContext): SourceFile | null => findSource(context.sources, block.astGraph.filePath)?.source ?? null

const lineSpansOf = (block: CodeBlock): LineSpan[] => block.lineOfCodeRangeReference.map(({ start, end }) => [start.line, end.line])

const isChanged = (block: CodeBlock): boolean => block.lineOfCodeDiffs !== null

const isLineChanged = (block: CodeBlock, line: number): boolean =>
  (block.lineOfCodeDiffs ?? []).some(({ start, end }) => start.line <= line && line <= end.line)

const changeOfSite = (block: CodeBlock, at: Position | null): NodeChange | null => {
  const isSiteChanged = at === null ? isChanged(block) : isLineChanged(block, at.line)
  return isSiteChanged ? "modified" : null
}

const hintOfRow = (written: string | null, block: CodeBlock, change: NodeChange | null): string | null =>
  written !== null ? null : hintOf([block], change ?? "unchanged")

const writtenLabelsOf = (node: TraceNode): ReadonlyMap<string, string | null> =>
  new Map(node.blockLabels.map(({ label, codeBlock, at }) => [siteIdOf(codeBlock, at), label] as const))

const calleeNameOf = ({ callee }: CallSite): string => (callee.type === ROOT_ARGUMENT ? (callee.name ?? nameOfBlock(callee)) : nameOfBlock(callee))

const NAME_SEPARATOR = "."

const symbolNameOf = ({ symbol, callee }: CallSite): string => {
  const reference = symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockReference : callee
  const referenceName = symbol.binding ?? reference.name ?? nameOfBlock(reference)
  const bareName = isBareName(symbol) ? lastKeyOf(symbol) : null
  return bareName ?? [referenceName, ...(symbol.member?.path ?? [])].join(NAME_SEPARATOR)
}

const callNameOf = (site: CallSite, context: ReviewViewContext): string => {
  const source = sourceOf(site.block, context)
  const written = source === null ? null : textAt(source, site.symbol.usedAt)
  return `${written ?? symbolNameOf(site)}${CALL_SUFFIX}`
}

const siteRowOf = (id: string, name: string, block: CodeBlock, at: Position | null, written: ReadonlyMap<string, string | null>): ListedRow => {
  const label = written.get(id) ?? null
  const change = changeOfSite(block, at)
  return {
    id,
    name,
    label: label ?? name,
    isDraft: label === null,
    hint: hintOfRow(label, block, change),
    change,
    lines: at === null ? lineSpansOf(block) : [[at.line, at.line]],
  }
}

const argumentRowOf = (parameter: CodeBlock, context: ReviewViewContext): ListedRow => {
  const text = parameterTextOf(parameter, sourceOf(parameter, context))
  const name = text === "" ? nameOfBlock(parameter) : text
  return { id: parameter.id, name, label: name, isDraft: false, hint: null, change: changeOfSite(parameter, null), lines: lineSpansOf(parameter) }
}

const callRowOf = (site: CallSite, written: ReadonlyMap<string, string | null>, context: ReviewViewContext): ListedRow =>
  siteRowOf(siteIdOf(site.block, site.at), callNameOf(site, context), site.block, site.at, written)

const THROW_CUTS: readonly RegExp[] = [/\(.*$/su, /\sfrom\s.*$/su, /;\s*$/u]
const WHITESPACE = /\s+/gu
const SPACE = " "

const statementStartOf = (text: string): string =>
  THROW_CUTS.reduce((cut, pattern) => cut.replace(pattern, ""), text).replace(WHITESPACE, SPACE).trim()

const throwNameOf = (block: CodeBlock, context: ReviewViewContext): string => {
  const source = sourceOf(block, context)
  const written = source === null ? null : textAt(source, block.lineOfCodeRangeReference[0])
  const start = written === null ? "" : statementStartOf(written)
  return start === "" ? nameOfBlock(block) : start
}

const exitNameOf = ({ kind, block }: ExitSite, context: ReviewViewContext): string => (kind === "return" ? RETURN_NAME : throwNameOf(block, context))

const exitRowOf = (site: ExitSite, written: ReadonlyMap<string, string | null>, context: ReviewViewContext): ListedRow =>
  siteRowOf(siteIdOf(site.block, site.at), exitNameOf(site, context), site.block, site.at, written)

const listOf = (kind: NodeBlockListKind, blocks: readonly ListedRow[]): TraceBlockListView[] =>
  blocks.length === 0 ? [] : [{ kind, label: BLOCK_LIST_LABELS[kind], blocks: [...blocks] }]

const exitsOfKind = (exits: readonly ExitSite[], kind: ExitSite["kind"]): ExitSite[] => exits.filter((site) => site.kind === kind)

const calleeCardsOf = (node: TraceNode, calls: readonly CallSite[], changeOf: ChangeOfBlock): TraceCalleeCardView[] =>
  [...groupBy(calls, (site) => site.callee.id).values()].map((sites) => {
    const [{ callee }] = sites
    const change = callee.type === ROOT_ARGUMENT ? null : changeOf(callee)
    return {
      id: `${node.id}${CALLEE_MARK}${callee.id}`,
      name: calleeNameOf(sites[0]),
      type: callee.type,
      typeLabel: BLOCK_TYPE_LABELS[callee.type],
      change,
      changedLabel: change === null ? null : CHANGE_LABELS[change],
      rowIds: sites.map((site) => siteIdOf(site.block, site.at)),
    }
  })

const isFilled = ({ rowIds, childIds, calleeCards }: TraceRowGroupView): boolean => calleeCards !== undefined || rowIds.length > 0 || childIds.length > 0

export const buildFunctionCardView = (node: TraceNode, context: ReviewViewContext, changeOf: ChangeOfBlock): FunctionCardView => {
  const { parameters, calls, exits } = rowsOfNode(node)
  const written = writtenLabelsOf(node)
  const exitIds = exits.map((site) => siteIdOf(site.block, site.at))
  return {
    blockLists: [
      ...listOf(ARGUMENT, parameters.map((parameter) => argumentRowOf(parameter, context))),
      ...listOf(CALL, calls.map((site) => callRowOf(site, written, context))),
      ...listOf("return", exitsOfKind(exits, "return").map((site) => exitRowOf(site, written, context))),
      ...listOf("throw", exitsOfKind(exits, "throw").map((site) => exitRowOf(site, written, context))),
    ],
    rowGroups: [
      { label: ARGUMENTS_LABEL, rowIds: parameters.map((parameter) => parameter.id), childIds: [] },
      { label: CALLS_LABEL, rowIds: [], childIds: [], calleeCards: calleeCardsOf(node, calls, changeOf) },
      { label: TRIGGERS_LABEL, rowIds: node.triggerLabels.map(({ codeBlock }) => codeBlock.id), childIds: [] },
      { label: EXITS_LABEL, rowIds: exitIds, childIds: [] },
      { label: null, rowIds: [], childIds: node.children.filter((child) => child.codeBlocks[0].isReturned === true).map((child) => child.id) },
    ].filter(isFilled),
  }
}

const callingExactly = (sites: readonly CallSite[], toBlock: CodeBlock): CallSite | null =>
  sites.find(({ called }) => called?.id === toBlock.id) ?? null

const callingAround = (sites: readonly CallSite[], toBlock: CodeBlock): CallSite | null =>
  sites.find(({ called, callee }) => callee.id === toBlock.id || (called !== null && isWithin(called, toBlock))) ?? null

const blocksUpFrom = (block: CodeBlock, nodeBlock: CodeBlock): CodeBlock[] =>
  block.id === nodeBlock.id || block.parentBlock === null ? [block] : [block, ...blocksUpFrom(block.parentBlock, nodeBlock)]

export const functionCardRowFinder = (node: TraceNode): RowFinder => {
  const [nodeBlock] = node.codeBlocks
  const { parameters, calls, exits } = rowsOfNode(node)
  const sitesByBlockId = groupBy(calls, (site) => site.block.id)
  const plainRowIds = new Map([...parameters, ...exits.filter((site) => site.at === null).map((site) => site.block)].map((block) => [block.id, block.id] as const))
  const idOfSite = (site: CallSite | null): string | null => (site === null ? null : siteIdOf(site.block, site.at))
  const firstOf = (sites: readonly CallSite[]): CallSite | null => (sites.length === 0 ? null : sites[0])
  return {
    fromRowOf: (block, toBlock) => {
      const around = blocksUpFrom(block, nodeBlock).flatMap((up) => sitesByBlockId.get(up.id) ?? [])
      if (toBlock === null) return idOfSite(firstOf(around))
      if (isWithin(toBlock, nodeBlock)) return null
      return idOfSite(callingExactly(around, toBlock) ?? callingAround(around, toBlock) ?? callingExactly(calls, toBlock) ?? callingAround(calls, toBlock) ?? firstOf(around))
    },
    toRowOf: (block) => blocksUpFrom(block, nodeBlock).map((up) => plainRowIds.get(up.id)).find((id) => id !== undefined) ?? null,
  }
}
