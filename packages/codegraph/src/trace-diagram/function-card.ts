import { comparePositions } from "@/code-blocks/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import type { BlockLabel, CodeBlock, CodeBlockSymbol, CodeBlockType, Position } from "@flightplan/configurations"
import { isParameterOf } from "./listed-blocks"
import { eventHandedTo, foldedValueOf, isNodeBlock, nodeBlockOf } from "./node-blocks"
import { isInFoldedCallback, libraryHookCalleeOf, repositoryCalleeOf, storePartCalled } from "./repository-calls"
import { isParameter, isWithin } from "./step-folding"

export interface CallSite {
  readonly block: CodeBlock
  readonly at: Position
  readonly symbol: CodeBlockSymbol
  readonly callee: CodeBlock
  readonly called: CodeBlock | null
}

export type ExitKind = "return" | "throw"

export interface ExitSite {
  readonly kind: ExitKind
  readonly block: CodeBlock
  readonly at: Position | null
}

export interface FunctionCardRows {
  readonly parameters: readonly CodeBlock[]
  readonly calls: readonly CallSite[]
  readonly exits: readonly ExitSite[]
}

const CALLING: CodeBlockSymbol["use"] = "call"
const THROW: CodeBlockType = "throw"
const TRIGGER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["render-event", "code-event", "data-fetch"])
const CLASS: CodeBlockType = "class"
const METHOD: CodeBlockType = "method"
const HOLDER = "holder"
const SITE_MARK = "@"
const POSITION_SEPARATOR = ":"
const RECEIVER_NAMES: ReadonlySet<string> = new Set(["self", "cls", "this"])
const FUNCTION_CARD_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method", "hook", "render-event", "code-event", "effect-callback"])
const PARAMETER: CodeBlockType = "root-argument-value"
const CALLEE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method", "hook", "class"])
const DECLARATION_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["variable", "external-value", "property"])

export const isFunctionCardBlock = (block: CodeBlock): boolean =>
  FUNCTION_CARD_TYPES.has(block.type) && block.card?.part !== HOLDER

export const siteIdOf = (block: CodeBlock, at: Position | null | undefined): string =>
  at === null || at === undefined ? block.id : `${block.id}${SITE_MARK}${String(at.line)}${POSITION_SEPARATOR}${String(at.column)}`

export const isWithinOrSame = (block: CodeBlock, holder: CodeBlock): boolean => block.id === holder.id || isWithin(block, holder)

const classOf = (block: CodeBlock): CodeBlock | null => {
  if (block.type === CLASS) return block
  return block.parentBlock === null ? null : classOf(block.parentBlock)
}

const isReceiver = (block: CodeBlock): boolean => RECEIVER_NAMES.has(block.name ?? "")

export const referenceOf = (symbol: CodeBlockSymbol): CodeBlock | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockReference : null

const calledOf = (symbol: CodeBlockSymbol, reference: CodeBlock): CodeBlock | null => (symbol.member === undefined ? reference : symbol.member.block)

interface Callee {
  readonly callee: CodeBlock
  readonly called: CodeBlock | null
}

const isOwnClassCall = (called: CodeBlock, nodeBlock: CodeBlock): boolean => {
  const ownClass = nodeBlock.type === METHOD ? classOf(nodeBlock) : null
  return ownClass !== null && called.type === METHOD && classOf(called)?.id === ownClass.id
}

const outsideCalleeOf = (called: CodeBlock | null, nodeBlock: CodeBlock): Callee | null => {
  if (called === null || !CALLEE_TYPES.has(called.type) || isOwnClassCall(called, nodeBlock)) return null
  return { callee: called.type === METHOD ? (classOf(called) ?? called) : called, called }
}

const handedCalleeOf = (parameter: CodeBlock, called: CodeBlock | null): Callee | null => {
  if (isReceiver(parameter)) return null
  if (called?.id === parameter.id) return { callee: parameter, called: null }
  return called !== null && CALLEE_TYPES.has(called.type) ? { callee: parameter, called } : null
}

const originsIn = (holder: CodeBlock, nodeBlock: CodeBlock, seenIds: ReadonlySet<string>): CodeBlock[] =>
  holder.outerSymbols.flatMap((symbol) => calleeOfSymbol(symbol, nodeBlock, seenIds, holder)?.callee ?? [])

const originOf = (declaration: CodeBlock, nodeBlock: CodeBlock, seenIds: ReadonlySet<string>): CodeBlock | null => {
  if (seenIds.has(declaration.id)) return null
  const seen = new Set([...seenIds, declaration.id])
  const origins = [declaration, ...declaration.childrenBlocks].flatMap((holder) => originsIn(holder, nodeBlock, seen))
  return origins.length === 0 ? null : origins[0]
}

export const lastKeyOf = ({ member }: CodeBlockSymbol): string | null =>
  member === undefined || member.path.length === 0 ? null : member.path[member.path.length - 1]

export const isBareName = (symbol: CodeBlockSymbol): boolean => {
  const last = lastKeyOf(symbol)
  const { start, end } = symbol.usedAt
  return last !== null && start.line === end.line && end.column - start.column === last.length
}

const declaredCalleeOf = (declaration: CodeBlock, symbol: CodeBlockSymbol, nodeBlock: CodeBlock, seenIds: ReadonlySet<string>): Callee | null => {
  const called = symbol.member === undefined ? null : symbol.member.block
  const origin = originOf(declaration, nodeBlock, seenIds)
  const part = origin === null ? null : storePartCalled(origin, symbol)
  if (origin !== null && part !== null) return { callee: origin, called: part }
  if (symbol.member !== undefined && !isBareName(symbol) && (called === null || !CALLEE_TYPES.has(called.type))) return null
  return origin === null ? outsideCalleeOf(called, nodeBlock) : { callee: origin, called }
}

const isParameterAround = (reference: CodeBlock, nodeBlock: CodeBlock): boolean => {
  const holder = reference.parentBlock
  return isParameterOf(reference, nodeBlock) || (reference.type === PARAMETER && holder !== null && holder.type !== PARAMETER && isWithin(nodeBlock, holder))
}

const calleeOfSymbol = (symbol: CodeBlockSymbol, nodeBlock: CodeBlock, seenIds: ReadonlySet<string>, block: CodeBlock | null = null): Callee | null => {
  if (symbol.use !== CALLING) return null
  const reference = referenceOf(symbol)
  if (reference === null) return null
  const called = calledOf(symbol, reference)
  if (isParameterAround(reference, nodeBlock)) return symbol.isRunInPlace === true ? null : handedCalleeOf(reference, called)
  if (DECLARATION_TYPES.has(reference.type)) return declaredCalleeOf(reference, symbol, nodeBlock, seenIds)
  if (isWithinOrSame(reference, nodeBlock)) return null
  return outsideCalleeOf(called, nodeBlock) ?? repositoryCalleeOf(symbol, reference, block)
}

const NO_IDS: ReadonlySet<string> = new Set()

export const listBlocksWithin = (block: CodeBlock): CodeBlock[] => [block, ...block.childrenBlocks.flatMap(listBlocksWithin)]

const isOwnBlock = (block: CodeBlock, nodeBlock: CodeBlock): boolean =>
  block.id === nodeBlock.id || (!isNodeBlock(block) && nodeBlockOf(block)?.id === nodeBlock.id)

const listHandedFunctions = (nodeBlock: CodeBlock): CodeBlock[] => nodeBlock.nextBlocks.filter((next) => eventHandedTo(next)?.id === nodeBlock.id)

export const listOwnBlocks = (nodeBlock: CodeBlock): CodeBlock[] =>
  firstOfEach([nodeBlock, ...listHandedFunctions(nodeBlock)].flatMap(listBlocksWithin), (block) => block.id).filter((block) => isOwnBlock(block, nodeBlock))

const isInThrow = (block: CodeBlock, nodeBlock: CodeBlock): boolean => {
  if (block.type === THROW) return true
  return block.id !== nodeBlock.id && block.parentBlock !== null && isInThrow(block.parentBlock, nodeBlock)
}

const DECORATOR_OFFSET = 1

const decoratorLinesOf = (block: CodeBlock): ReadonlySet<number> => {
  const { start } = block.lineOfCodeRangeReference[0]
  const marked = block.outerSymbols.map(({ usedAt }) => usedAt.start).filter(({ column }) => column === start.column + DECORATOR_OFFSET).map(({ line }) => line)
  const lastLine = marked.includes(start.line) ? Math.max(...marked) : start.line - DECORATOR_OFFSET
  return new Set(Array.from({ length: lastLine - start.line + DECORATOR_OFFSET }, (_, offset) => start.line + offset))
}

const isWrittenInDecorator = (symbol: CodeBlockSymbol, decoratorLines: ReadonlySet<number>): boolean => decoratorLines.has(symbol.usedAt.start.line)

const callSitesIn = (block: CodeBlock, nodeBlock: CodeBlock): CallSite[] => {
  const decoratorLines = decoratorLinesOf(block)
  return block.outerSymbols.filter((symbol) => !isWrittenInDecorator(symbol, decoratorLines)).flatMap((symbol) => {
    const found = calleeOfSymbol(symbol, nodeBlock, NO_IDS, block) ?? libraryHookCalleeOf(symbol, block)
    return found === null ? [] : [{ block, at: symbol.usedAt.start, symbol, ...found }]
  })
}

const isTriggerInside = (block: CodeBlock, nodeBlock: CodeBlock): boolean => block.id !== nodeBlock.id && TRIGGER_TYPES.has(block.type)

const isLeftOutOfRows = (block: CodeBlock, nodeBlock: CodeBlock): boolean => isInThrow(block, nodeBlock) || isTriggerInside(block, nodeBlock) || isInFoldedCallback(block)

const callSitesOf = (block: CodeBlock, nodeBlock: CodeBlock): CallSite[] => (isLeftOutOfRows(block, nodeBlock) ? [] : callSitesIn(block, nodeBlock))

const exitSitesOf = (block: CodeBlock): ExitSite[] => [
  ...(block.type === THROW ? [{ kind: "throw" as const, block, at: null }] : []),
  ...(block.returnsAt ?? []).map((at) => ({ kind: "return" as const, block, at })),
]

const startOf = (block: CodeBlock, at: Position | null): Position => at ?? block.lineOfCodeRangeReference[0].start

export const inWrittenOrder = <Site extends { readonly block: CodeBlock, readonly at: Position | null }>(sites: readonly Site[]): Site[] =>
  [...sites].sort((one, two) => comparePositions(startOf(one.block, one.at), startOf(two.block, two.at)))

const isHeldOutside = (block: CodeBlock, nodeBlock: CodeBlock): boolean => !isWithinOrSame(block, nodeBlock) && foldedValueOf(block) === null

export const listFunctionCardRows = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[] = []): FunctionCardRows => {
  const ownBlocks = listOwnBlocks(nodeBlock)
  const scanned = firstOfEach([...ownBlocks, ...insideBlocks.filter((block) => isHeldOutside(block, nodeBlock))], (block) => block.id)
  return {
    parameters: [nodeBlock, ...listHandedFunctions(nodeBlock)].flatMap((holder) => holder.childrenBlocks).filter((child) => (isParameterOf(child, nodeBlock) || isParameter(child)) && !isReceiver(child)),
    calls: inWrittenOrder(scanned.flatMap((block) => callSitesOf(block, nodeBlock))),
    exits: inWrittenOrder(ownBlocks.flatMap(exitSitesOf)),
  }
}

export interface LabelSite {
  readonly block: CodeBlock
  readonly at: Position | null
}

export const labelsOfSites = (sites: readonly LabelSite[]): BlockLabel[] =>
  inWrittenOrder(sites).map(({ block, at }) => (at === null ? { label: null, codeBlock: block } : { label: null, codeBlock: block, at }))

export const listFunctionCardLabels = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): BlockLabel[] => {
  const { calls, exits } = listFunctionCardRows(nodeBlock, insideBlocks)
  return labelsOfSites([...calls, ...exits])
}
