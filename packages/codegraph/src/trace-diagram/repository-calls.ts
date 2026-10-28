import type { CardKind, CardPart, CodeBlock, CodeBlockSymbol, CodeBlockType, SourceRange } from "@flightplan/configurations"
import { callbacksOf, isEffectHookBlock, memoCallOf } from "./hook-calls"

export interface RepositoryCallee {
  readonly callee: CodeBlock
  readonly called: CodeBlock
}

const CALL_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["component-effect", "effect"])
const HANDED_FUNCTION_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "derived"])
const STORE_CARD_KINDS: ReadonlySet<CardKind> = new Set<CardKind>(["store", "api"])
const STATE: CodeBlockType = "state"
const HOLDER: CardPart = "holder"
const ENDPOINT: CardPart = "endpoint"
const PROCEDURE: CardPart = "procedure"
const CALLING: CodeBlockSymbol["use"] = "call"
const READING_USES: ReadonlySet<CodeBlockSymbol["use"]> = new Set<CodeBlockSymbol["use"]>(["value", "read"])
const IN_PLACE = "in-place"
const HOOK_NAME = /^use[A-Z]/u
const GENERATED_HOOK_NAME = /^use(?:Lazy)?(?<endpoint>[A-Z]\w*?)(?:Infinite)?(?:Query|Mutation)$/u

const referenceOf = (symbol: CodeBlockSymbol): CodeBlock | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockReference : null

const isHolder = (block: CodeBlock): boolean => block.card?.part === HOLDER

const isStoreCardValue = (block: CodeBlock): boolean => block.card !== undefined && STORE_CARD_KINDS.has(block.card.kind)

const isStoreValue = (block: CodeBlock): boolean => isStoreCardValue(block) || (block.type === STATE && block.parentBlock === null)

const holderReadBy = (value: CodeBlock): CodeBlock | null =>
  value.outerSymbols.flatMap((symbol) => {
    const reference = READING_USES.has(symbol.use) ? referenceOf(symbol) : null
    return reference !== null && isHolder(reference) && isStoreCardValue(reference) ? [reference] : []
  })[0] ?? null

const listWithin = (block: CodeBlock): CodeBlock[] => block.childrenBlocks.flatMap((child) => [child, ...listWithin(child)])

const endpointNameOf = (hookName: string): string | null => {
  const endpoint = GENERATED_HOOK_NAME.exec(hookName)?.groups?.endpoint ?? null
  return endpoint === null ? null : `${endpoint.charAt(0).toLowerCase()}${endpoint.slice(1)}`
}

const endpointOf = (holder: CodeBlock, hookName: string): CodeBlock | null => {
  const name = endpointNameOf(hookName)
  return name === null ? null : (listWithin(holder).find((block) => block.card?.part === ENDPOINT && block.name === name) ?? null)
}

const storeCalleeOf = (reference: CodeBlock, symbol: CodeBlockSymbol): RepositoryCallee | null => {
  if (isStoreValue(reference)) return { callee: reference, called: reference }
  const holder = holderReadBy(reference)
  return holder === null ? null : { callee: holder, called: endpointOf(holder, symbol.binding ?? reference.name ?? "") ?? holder }
}

const storePartOf = (block: CodeBlock): CodeBlock | null => {
  if (isHolder(block)) return null
  if (isStoreCardValue(block)) return block
  return block.parentBlock === null ? null : storePartOf(block.parentBlock)
}

const isPart = (block: CodeBlock): boolean => isStoreCardValue(block) && !isHolder(block)

const partNamed = (store: CodeBlock, name: string): CodeBlock | null => listWithin(store).find((block) => isPart(block) && block.name === name) ?? null

export const storePartCalled = (store: CodeBlock, symbol: CodeBlockSymbol): CodeBlock | null => {
  const member = symbol.member
  if (!isStoreValue(store) || member === undefined) return null
  const lastKey = member.path.length === 0 ? null : member.path[member.path.length - 1]
  if (lastKey === null) return null
  const resolved = member.block?.name === lastKey ? storePartOf(member.block) : null
  return resolved ?? partNamed(store, lastKey)
}

const partCalleeOf = (symbol: CodeBlockSymbol, reference: CodeBlock): RepositoryCallee | null => {
  const store = storeCalleeOf(reference, symbol)
  const part = store === null ? null : storePartCalled(store.callee, symbol)
  return store === null || part === null ? null : { callee: store.callee, called: part }
}

export const procedureReachedFrom = (block: CodeBlock): CodeBlock | null => block.nextBlocks.find((next) => next.card?.part === PROCEDURE) ?? null

export const repositoryCalleeOf = (symbol: CodeBlockSymbol, reference: CodeBlock, block: CodeBlock | null): RepositoryCallee | null => {
  const procedure = block === null || symbol.member === undefined ? null : procedureReachedFrom(block)
  if (procedure !== null) return { callee: procedure, called: procedure }
  return symbol.member === undefined ? storeCalleeOf(reference, symbol) : partCalleeOf(symbol, reference)
}

const isLibraryHookCall = (symbol: CodeBlockSymbol): boolean =>
  symbol.use === CALLING && symbol.type === "unopened-import" && symbol.isLibrary && HOOK_NAME.test(symbol.importedName)

const isHandedToHook = (reference: CodeBlock): boolean => isStoreValue(reference) || (reference.parentBlock === null && HANDED_FUNCTION_TYPES.has(reference.type))

const runsInPlace = (callback: CodeBlock): boolean => (callback.catalogue?.runs ?? IN_PLACE) === IN_PLACE

const isSameRange = (one: SourceRange, two: SourceRange): boolean =>
  one.start.line === two.start.line && one.start.column === two.start.column && one.end.line === two.end.line && one.end.column === two.end.column

const namedSymbolsOf = (callback: CodeBlock): CodeBlockSymbol[] =>
  callback.outerSymbols.filter((symbol) => isSameRange(symbol.usedAt, callback.lineOfCodeRangeReference[0]))

const valueHandedTo = (block: CodeBlock): CodeBlock | null =>
  [...block.outerSymbols, ...callbacksOf(block).filter(runsInPlace).flatMap(namedSymbolsOf)].flatMap((symbol) => {
    const reference = READING_USES.has(symbol.use) ? referenceOf(symbol) : null
    return reference !== null && isHandedToHook(reference) ? [reference] : []
  })[0] ?? null

const isOwnHookCall = (block: CodeBlock): boolean => isEffectHookBlock(block) || (block.parentBlock !== null && memoCallOf(block.parentBlock)?.id === block.id)

export const libraryHookCalleeOf = (symbol: CodeBlockSymbol, block: CodeBlock): RepositoryCallee | null => {
  if (!isLibraryHookCall(symbol) || isOwnHookCall(block)) return null
  const handed = valueHandedTo(block)
  return handed === null ? null : { callee: handed, called: handed }
}

const callsStoreValue = (block: CodeBlock): boolean =>
  block.outerSymbols.some((symbol) => {
    const reference = symbol.use === CALLING && symbol.member === undefined ? referenceOf(symbol) : null
    return reference !== null && storeCalleeOf(reference, symbol) !== null
  })

const callsLibraryHookOnStore = (block: CodeBlock): boolean => {
  const handed = block.outerSymbols.some(isLibraryHookCall) ? valueHandedTo(block) : null
  return handed !== null && isStoreValue(handed)
}

export const isFoldedCall = (block: CodeBlock): boolean =>
  CALL_TYPES.has(block.type)
  && !isEffectHookBlock(block)
  && callbacksOf(block).every(runsInPlace)
  && (callsStoreValue(block) || callsLibraryHookOnStore(block))

export const isInFoldedCallback = (block: CodeBlock): boolean => isFoldedCallback(block) || (block.parentBlock !== null && isInFoldedCallback(block.parentBlock))

export const isFoldedCallback = (block: CodeBlock): boolean => block.parentBlock !== null && isFoldedCall(block.parentBlock) && callbacksOf(block.parentBlock).some((callback) => callback.id === block.id)
