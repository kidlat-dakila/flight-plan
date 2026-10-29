import { comparePositions } from "@/code-blocks/source-range"
import type { BlockLabel, CodeBlock, CodeBlockSymbol, CodeBlockType, Position, RenderRowKind } from "@flightplan/configurations"
import { inWrittenOrder, labelsOfSites, listFunctionCardRows, listOwnBlocks, referenceOf, type CallSite, type LabelSite } from "./function-card"
import { isMemoBlock } from "./hook-calls"
import { isParameterOf } from "./listed-blocks"
import { isNodeBlock, nodeBlockAround } from "./node-blocks"

export interface RenderRow {
  readonly kind: RenderRowKind
  readonly block: CodeBlock
  readonly at: Position | null
  readonly wrapper: CodeBlock | null
  readonly rendered: CodeBlock | null
  readonly symbol: CodeBlockSymbol | null
  readonly branch: number
}

export interface RenderGroup {
  readonly block: CodeBlock
  readonly at: Position | null
  readonly markup: CodeBlock | null
  readonly rows: readonly RenderRow[]
}

export interface ComponentCardRows {
  readonly props: readonly CodeBlock[]
  readonly states: readonly CodeBlock[]
  readonly calls: readonly CallSite[]
  readonly memos: readonly CodeBlock[]
  readonly effects: readonly CodeBlock[]
  readonly renderGroups: readonly RenderGroup[]
}

const COMPONENT: CodeBlockType = "component"
const STATE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["state", "derived"])
const EFFECT_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["effect", "component-effect", "effect-callback"])
const FUNCTION_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "component", "hook", "method", "effect-callback", "render-event", "code-event"])
const RENDER_ROOT: CodeBlockType = "render-root"
const ELEMENT: CodeBlockType = "render"
const EVENT: CodeBlockType = "render-event"
const WRAPPER_KINDS: ReadonlyMap<CodeBlockType, RenderRowKind> = new Map<CodeBlockType, RenderRowKind>([
  ["render-condition", "condition"],
  ["render-loop", "loop"],
])
const RENDERING: CodeBlockSymbol["use"] = "render"
const UNOPENED_IMPORT = "unopened-import"
const WRAPPING_USES: ReadonlySet<CodeBlockSymbol["use"]> = new Set<CodeBlockSymbol["use"]>(["value", "read"])
const TRIGGER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "data-fetch"])
const MARKUP_VALUE_USES: ReadonlySet<CodeBlockSymbol["use"]> = new Set<CodeBlockSymbol["use"]>(["value", "call"])
const LINES_AFTER_RETURN = 1

export const isComponentCardBlock = (block: CodeBlock): boolean => block.type === COMPONENT

const startOf = (block: CodeBlock): Position => block.lineOfCodeRangeReference[0].start

const isInNestedFunction = (block: CodeBlock, nodeBlock: CodeBlock): boolean =>
  block.id !== nodeBlock.id && (FUNCTION_TYPES.has(block.type) || (block.parentBlock !== null && isInNestedFunction(block.parentBlock, nodeBlock)))

const isHeldNode = (block: CodeBlock, nodeBlock: CodeBlock): boolean => isNodeBlock(block) && nodeBlockAround(block)?.id === nodeBlock.id

const isWithin = (block: CodeBlock, holder: CodeBlock): boolean =>
  block.parentBlock !== null && (block.parentBlock.id === holder.id || isWithin(block.parentBlock, holder))

const listMarkupBlocks = (block: CodeBlock): CodeBlock[] =>
  block.childrenBlocks.flatMap((child) => (isNodeBlock(child) || child.type === EVENT ? [] : [child, ...listMarkupBlocks(child)]))

const wrappersOf = (block: CodeBlock, markup: CodeBlock): CodeBlock[] => {
  const around = block.parentBlock
  if (around === null || around.id === markup.id || !isWithin(around, markup)) return []
  return [...(WRAPPER_KINDS.has(around.type) ? [around] : []), ...wrappersOf(around, markup)]
}

const listBlocksWithin = (block: CodeBlock): CodeBlock[] => [block, ...block.childrenBlocks.flatMap(listBlocksWithin)]

const wrappedComponentOf = (value: CodeBlock): CodeBlock | null =>
  listBlocksWithin(value).flatMap((block) => block.outerSymbols).flatMap((symbol) => {
    const reference = WRAPPING_USES.has(symbol.use) ? referenceOf(symbol) : null
    return reference?.type === COMPONENT ? [reference] : []
  })[0] ?? null

const componentOf = (reference: CodeBlock): CodeBlock | null => (reference.type === COMPONENT ? reference : wrappedComponentOf(reference))

const renderedOf = (symbol: CodeBlockSymbol): CodeBlock | null => {
  const reference = referenceOf(symbol)
  return reference === null ? null : componentOf(reference)
}

const isRepositoryComponent = (symbol: CodeBlockSymbol): boolean =>
  symbol.use === RENDERING && (symbol.type === UNOPENED_IMPORT ? !symbol.isLibrary : renderedOf(symbol) !== null)

const componentRenderOf = (block: CodeBlock): CodeBlockSymbol | null => (block.type === ELEMENT ? (block.outerSymbols.find(isRepositoryComponent) ?? null) : null)

const componentRowOf = (block: CodeBlock, symbol: CodeBlockSymbol, markup: CodeBlock): RenderRow => ({
  kind: "component",
  block,
  at: null,
  wrapper: wrappersOf(block, markup)[0] ?? null,
  rendered: renderedOf(symbol),
  symbol: null,
  branch: 0,
})

const withBranches = (rows: readonly RenderRow[]): RenderRow[] =>
  rows.map((row, index) => ({ ...row, branch: row.wrapper === null ? 0 : rows.slice(0, index).filter((before) => before.wrapper?.id === row.wrapper?.id).length }))

const valueRowsOf = (block: CodeBlock, nodeBlock: CodeBlock): RenderRow[] =>
  block.outerSymbols.flatMap((symbol) => {
    const reference = MARKUP_VALUE_USES.has(symbol.use) ? referenceOf(symbol) : null
    if (reference?.type !== COMPONENT || reference.id === nodeBlock.id) return []
    return [{ kind: "value" as const, block, at: symbol.usedAt.start, wrapper: null, rendered: reference, symbol, branch: 0 }]
  })

const anchorOf = ({ block, at, wrapper }: RenderRow): Position => at ?? startOf(wrapper ?? block)

const listRenderRows = (markup: CodeBlock, nodeBlock: CodeBlock): RenderRow[] => {
  const blocks = [markup, ...listMarkupBlocks(markup)]
  const componentRows = withBranches(blocks.flatMap((block) => {
    const symbol = componentRenderOf(block)
    return symbol === null ? [] : [componentRowOf(block, symbol, markup)]
  }))
  const supersededIds = new Set(componentRows.flatMap(({ block }) => wrappersOf(block, markup).map((wrapper) => wrapper.id)))
  const wrapperRows = blocks.flatMap((block): RenderRow[] => {
    const kind = WRAPPER_KINDS.get(block.type)
    return kind === undefined || supersededIds.has(block.id) ? [] : [{ kind, block, at: null, wrapper: null, rendered: null, symbol: null, branch: 0 }]
  })
  const rows = [...wrapperRows, ...componentRows, ...blocks.flatMap((block) => valueRowsOf(block, nodeBlock))]
  return [...rows].sort((one, two) => comparePositions(anchorOf(one), anchorOf(two)))
}

const isMarkupOf = (renderRoot: CodeBlock, holder: CodeBlock, at: Position): boolean => {
  const start = startOf(renderRoot)
  return isWithin(renderRoot, holder) && comparePositions(start, at) >= 0 && start.line <= at.line + LINES_AFTER_RETURN
}

const markupOfReturn = (renderRoots: readonly CodeBlock[], holder: CodeBlock, at: Position): CodeBlock | null =>
  renderRoots.find((renderRoot) => comparePositions(startOf(renderRoot), at) === 0)
  ?? renderRoots.find((renderRoot) => isMarkupOf(renderRoot, holder, at))
  ?? null

const toRenderGroup = (block: CodeBlock, at: Position | null, markup: CodeBlock | null, nodeBlock: CodeBlock): RenderGroup => ({
  block,
  at,
  markup,
  rows: markup === null ? [] : listRenderRows(markup, nodeBlock),
})

const listRenderGroups = (nodeBlock: CodeBlock): RenderGroup[] => {
  const ownBlocks = listOwnBlocks(nodeBlock).filter((block) => !isInNestedFunction(block, nodeBlock))
  const renderRoots = ownBlocks.filter((block) => block.type === RENDER_ROOT)
  const returns = inWrittenOrder(ownBlocks.flatMap((block) => (block.returnsAt ?? []).map((at) => ({ block, at }))))
  if (returns.length > 0) return returns.map(({ block, at }) => toRenderGroup(block, at, markupOfReturn(renderRoots, block, at), nodeBlock))
  return renderRoots.filter((renderRoot) => renderRoot.parentBlock?.id === nodeBlock.id).map((renderRoot) => toRenderGroup(renderRoot, null, renderRoot, nodeBlock))
}

const isStateBlock = (block: CodeBlock): boolean => STATE_TYPES.has(block.type) && !isMemoBlock(block)

const isHeldCall = (block: CodeBlock): boolean => !isMemoBlock(block) && !EFFECT_TYPES.has(block.type) && !TRIGGER_TYPES.has(block.type)

const callSitesOfHeld = (held: CodeBlock): CallSite[] => listFunctionCardRows(held).calls.filter((site) => site.block.id === held.id)

export const listComponentCardRows = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): ComponentCardRows => {
  const heldNodes = insideBlocks.filter((block) => isHeldNode(block, nodeBlock))
  return {
    props: nodeBlock.childrenBlocks.filter((child) => isParameterOf(child, nodeBlock)),
    states: nodeBlock.childrenBlocks.filter(isStateBlock),
    calls: inWrittenOrder([...listFunctionCardRows(nodeBlock, insideBlocks).calls, ...heldNodes.filter(isHeldCall).flatMap(callSitesOfHeld)]),
    memos: heldNodes.filter(isMemoBlock),
    effects: heldNodes.filter((block) => EFFECT_TYPES.has(block.type)),
    renderGroups: listRenderGroups(nodeBlock),
  }
}

const renderSitesOf = ({ block, at, rows }: RenderGroup): LabelSite[] => [{ block, at }, ...rows.map((row) => ({ block: row.block, at: row.at }))]

export const listComponentCardLabels = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): BlockLabel[] => {
  const { calls, memos, effects, renderGroups } = listComponentCardRows(nodeBlock, insideBlocks)
  const heldSites = [...memos, ...effects].map((block) => ({ block, at: null }))
  return labelsOfSites([...calls, ...heldSites, ...renderGroups.flatMap(renderSitesOf)])
}
