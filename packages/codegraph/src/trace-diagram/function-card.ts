import { comparePositions } from "@/code-blocks/source-range"
import { firstOfEach } from "@/shared/first-of-each"
import type { BlockLabel, CodeBlock, CodeBlockSymbol, CodeBlockType, Position } from "@flightplan/configurations"
import { isParameterOf } from "./listed-blocks"
import { eventHandedTo, isNodeBlock, nodeBlockOf } from "./node-blocks"
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

const isWithinOrSame = (block: CodeBlock, holder: CodeBlock): boolean => block.id === holder.id || isWithin(block, holder)

const classOf = (block: CodeBlock): CodeBlock | null => {
  if (block.type === CLASS) return block
  return block.parentBlock === null ? null : classOf(block.parentBlock)
}

const isReceiver = (block: CodeBlock): boolean => RECEIVER_NAMES.has(block.name ?? "")

const referenceOf = (symbol: CodeBlockSymbol): CodeBlock | null =>
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

const originOf = (declaration: CodeBlock, nodeBlock: CodeBlock, seenIds: ReadonlySet<string>): CodeBlock | null => {
  if (seenIds.has(declaration.id)) return null
  const seen = new Set([...seenIds, declaration.id])
  const origins = declaration.outerSymbols.flatMap((symbol) => calleeOfSymbol(symbol, nodeBlock, seen)?.callee ?? [])
  return origins[0] ?? null
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
  if (symbol.member !== undefined && called === null && !isBareName(symbol)) return null
  const origin = originOf(declaration, nodeBlock, seenIds)
  return origin === null ? null : { callee: origin, called }
}

const isParameterAround = (reference: CodeBlock, nodeBlock: CodeBlock): boolean => {
  const holder = reference.parentBlock
  return isParameterOf(reference, nodeBlock) || (reference.type === PARAMETER && holder !== null && holder.type !== PARAMETER && isWithin(nodeBlock, holder))
}

const calleeOfSymbol = (symbol: CodeBlockSymbol, nodeBlock: CodeBlock, seenIds: ReadonlySet<string>): Callee | null => {
  if (symbol.use !== CALLING) return null
  const reference = referenceOf(symbol)
  if (reference === null) return null
  const called = calledOf(symbol, reference)
  if (isParameterAround(reference, nodeBlock)) return symbol.isRunInPlace === true ? null : handedCalleeOf(reference, called)
  if (DECLARATION_TYPES.has(reference.type)) return declaredCalleeOf(reference, symbol, nodeBlock, seenIds)
  return isWithinOrSame(reference, nodeBlock) ? null : outsideCalleeOf(called, nodeBlock)
}

const NO_IDS: ReadonlySet<string> = new Set()

const listBlocksWithin = (block: CodeBlock): CodeBlock[] => [block, ...block.childrenBlocks.flatMap(listBlocksWithin)]

const isOwnBlock = (block: CodeBlock, nodeBlock: CodeBlock): boolean =>
  block.id === nodeBlock.id || (!isNodeBlock(block) && nodeBlockOf(block)?.id === nodeBlock.id)

const listHandedFunctions = (nodeBlock: CodeBlock): CodeBlock[] => nodeBlock.nextBlocks.filter((next) => eventHandedTo(next)?.id === nodeBlock.id)

const listOwnBlocks = (nodeBlock: CodeBlock): CodeBlock[] =>
  firstOfEach([nodeBlock, ...listHandedFunctions(nodeBlock)].flatMap(listBlocksWithin), (block) => block.id).filter((block) => isOwnBlock(block, nodeBlock))

const isInThrow = (block: CodeBlock, nodeBlock: CodeBlock): boolean => {
  if (block.type === THROW) return true
  return block.id !== nodeBlock.id && block.parentBlock !== null && isInThrow(block.parentBlock, nodeBlock)
}

const callSitesIn = (block: CodeBlock, nodeBlock: CodeBlock): CallSite[] =>
  block.outerSymbols.flatMap((symbol) => {
    const found = calleeOfSymbol(symbol, nodeBlock, NO_IDS)
    return found === null ? [] : [{ block, at: symbol.usedAt.start, symbol, ...found }]
  })

const callSitesOf = (block: CodeBlock, nodeBlock: CodeBlock): CallSite[] => (isInThrow(block, nodeBlock) ? [] : callSitesIn(block, nodeBlock))

const exitSitesOf = (block: CodeBlock): ExitSite[] => [
  ...(block.type === THROW ? [{ kind: "throw" as const, block, at: null }] : []),
  ...(block.returnsAt ?? []).map((at) => ({ kind: "return" as const, block, at })),
]

const startOf = (block: CodeBlock, at: Position | null): Position => at ?? block.lineOfCodeRangeReference[0].start

const inWrittenOrder = <Site extends { readonly block: CodeBlock, readonly at: Position | null }>(sites: readonly Site[]): Site[] =>
  [...sites].sort((one, two) => comparePositions(startOf(one.block, one.at), startOf(two.block, two.at)))

export const listFunctionCardRows = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): FunctionCardRows => {
  const ownBlocks = listOwnBlocks(nodeBlock)
  const scanned = firstOfEach([...ownBlocks, ...insideBlocks.filter((block) => !isWithinOrSame(block, nodeBlock))], (block) => block.id)
  return {
    parameters: [nodeBlock, ...listHandedFunctions(nodeBlock)].flatMap((holder) => holder.childrenBlocks).filter((child) => (isParameterOf(child, nodeBlock) || isParameter(child)) && !isReceiver(child)),
    calls: inWrittenOrder(scanned.flatMap((block) => callSitesOf(block, nodeBlock))),
    exits: inWrittenOrder(ownBlocks.flatMap(exitSitesOf)),
  }
}

export const listFunctionCardLabels = (nodeBlock: CodeBlock, insideBlocks: readonly CodeBlock[]): BlockLabel[] => {
  const { calls, exits } = listFunctionCardRows(nodeBlock, insideBlocks)
  return inWrittenOrder<{ readonly block: CodeBlock, readonly at: Position | null }>([...calls, ...exits]).map(({ block, at }) =>
    at === null ? { label: null, codeBlock: block } : { label: null, codeBlock: block, at })
}
