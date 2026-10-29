import { firstOfEach } from "@/shared/first-of-each"
import type { CodeBlock, CodeBlockSymbol, CodeBlockType, Position } from "@flightplan/configurations"
import { isWithinOrSame, listBlocksWithin, listFunctionCardRows, listOwnBlocks, referenceOf, siteIdOf, type CallSite, type ExitSite } from "./function-card"
import { callbacksOf, hookCallOf, isSourceCallback } from "./hook-calls"

export type OutsideVariableKind = "constant" | "state" | "state-setter" | "prop" | "variable" | "function" | "import"

export interface SymbolSite {
  readonly block: CodeBlock
  readonly at: Position
  readonly symbol: CodeBlockSymbol
  readonly reference: CodeBlock | null
}

export interface OutsideVariable extends SymbolSite {
  readonly kind: OutsideVariableKind
}

export interface HookCallCardRows {
  readonly dependencies: readonly SymbolSite[]
  readonly outsideVariables: readonly OutsideVariable[]
  readonly calls: readonly CallSite[]
  readonly exits: readonly ExitSite[]
}

const VARIABLE_USES: ReadonlySet<CodeBlockSymbol["use"]> = new Set<CodeBlockSymbol["use"]>(["value", "read", "call"])
const CALLING: CodeBlockSymbol["use"] = "call"
const UNOPENED_IMPORT = "unopened-import"
const EXTERNAL_BLOCK = "external-block"
const STATE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["state", "derived"])
const FUNCTION_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "component", "hook", "method", "class"])
const PARAMETER: CodeBlockType = "root-argument-value"
const ROOT_VARIABLE: CodeBlockType = "root-variable"
const VARIABLE: CodeBlockType = "variable"
const COMPONENT: CodeBlockType = "component"
const SINGLE_FILE_COMPONENT_SUFFIX = ".vue"

const isScriptRootValue = (reference: CodeBlock): boolean =>
  reference.type === VARIABLE && reference.parentBlock?.type === COMPONENT && reference.astGraph.filePath.endsWith(SINGLE_FILE_COMPONENT_SUFFIX)

const isLibraryCall = (symbol: CodeBlockSymbol): boolean => symbol.type === UNOPENED_IMPORT && symbol.use === CALLING

const isVariableUse = (symbol: CodeBlockSymbol): boolean =>
  VARIABLE_USES.has(symbol.use) && !isLibraryCall(symbol) && (referenceOf(symbol) !== null || symbol.type === UNOPENED_IMPORT)

const symbolSitesOf = (block: CodeBlock): SymbolSite[] =>
  block.outerSymbols.filter(isVariableUse).map((symbol) => ({ block, at: symbol.usedAt.start, symbol, reference: referenceOf(symbol) }))

const siteKeyOf = ({ block, at }: { readonly block: CodeBlock, readonly at: Position }): string => siteIdOf(block, at)

const kindOfReference = (symbol: CodeBlockSymbol, reference: CodeBlock | null): OutsideVariableKind => {
  if (reference === null || symbol.type === EXTERNAL_BLOCK) return "import"
  if (STATE_TYPES.has(reference.type)) return symbol.use === CALLING ? "state-setter" : "state"
  if (reference.type === PARAMETER) return "prop"
  if (reference.type === ROOT_VARIABLE || isScriptRootValue(reference)) return "constant"
  return FUNCTION_TYPES.has(reference.type) ? "function" : "variable"
}

const referenceKeyOf = ({ symbol, reference, kind }: OutsideVariable): string =>
  `${reference?.id ?? (symbol.type === UNOPENED_IMPORT ? `${symbol.specifier}:${symbol.importedName}` : "")}|${kind}`

const listOutsideVariables = (nodeBlock: CodeBlock, bodyBlocks: readonly CodeBlock[], dependencies: readonly SymbolSite[], calls: readonly CallSite[]): OutsideVariable[] => {
  const callKeys = new Set(calls.map(siteKeyOf))
  const dependencyIds = new Set(dependencies.flatMap(({ reference }) => (reference === null ? [] : [reference.id])))
  const isOutside = ({ reference }: SymbolSite): boolean => reference === null || (!isWithinOrSame(reference, nodeBlock) && !dependencyIds.has(reference.id))
  const sites = bodyBlocks.flatMap(symbolSitesOf).filter((site) => !callKeys.has(siteKeyOf(site)) && isOutside(site))
  return firstOfEach(sites.map((site) => ({ ...site, kind: kindOfReference(site.symbol, site.reference) })), referenceKeyOf)
}

export const listHookCallCardRows = (nodeBlock: CodeBlock): HookCallCardRows => {
  const call = hookCallOf(nodeBlock) ?? nodeBlock
  const callbacks = callbacksOf(call)
  const ownIds = new Set(listOwnBlocks(nodeBlock).map((block) => block.id))
  const ownBlocksOf = (holders: readonly CodeBlock[]): CodeBlock[] => holders.flatMap(listBlocksWithin).filter((block) => ownIds.has(block.id))
  const sourceBlocks = ownBlocksOf(callbacks.filter((callback) => isSourceCallback(callback, call)))
  const bodyBlocks = ownBlocksOf(callbacks.filter((callback) => !isSourceCallback(callback, call)))
  const dependencies = firstOfEach([...symbolSitesOf(call), ...sourceBlocks.flatMap(symbolSitesOf)], siteKeyOf)
  const { calls, exits } = listFunctionCardRows(nodeBlock)
  return { dependencies, outsideVariables: listOutsideVariables(nodeBlock, bodyBlocks, dependencies, calls), calls, exits }
}
