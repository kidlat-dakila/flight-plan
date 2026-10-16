import { groupBy } from "@/shared/group-by"
import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { CodeBlockType } from "./types"

export interface TracedChains {
  readonly nextBlockIdsById: ReadonlyMap<string, readonly string[]>
  readonly diffSourceIdsById: ReadonlyMap<string, readonly string[]>
  readonly diffChainIds: readonly string[]
}

interface ChainIndex {
  readonly blockById: ReadonlyMap<string, StoredCodeBlock>
  readonly returnedIds: ReadonlySet<string>
  readonly heldMarkupIds: ReadonlySet<string>
  readonly calledArgumentIds: ReadonlySet<string>
}

type Types = ReadonlySet<CodeBlockType>

const typesOf = (...types: readonly CodeBlockType[]): Types => new Set(types)

const CALLABLE_TYPES = typesOf("function", "hook", "component", "method", "class")
const ARGUMENT: CodeBlockType = "root-argument-value"
const CALLBACK: CodeBlockType = "effect-callback"
const PROPERTY: CodeBlockType = "property"
const HELD_TYPES = typesOf("variable", "property", "call")
const OWNED_TYPES = typesOf("root-argument-value", "variable", "property")
const METHOD: CodeBlockType = "method"
const CLASS: CodeBlockType = "class"
const WRITTEN_IN_PLACE_TYPES = typesOf("function", "component")
const VALUE_TYPES = typesOf("external-value", "root-variable", "state", "derived")
const HANDED_TYPES = typesOf("effect", "component-effect", "code-event")
const CALLING_BACK_TYPES = typesOf(
  "effect",
  "component-effect",
  "code-event",
  "route",
  "resolver",
  "middleware",
  "transaction",
  "cache",
  "data",
  "data-fetch",
  "auth",
  "request",
  "navigation",
  "publish",
  "validation",
  "config",
  "feature-flag",
  "storage",
  "telemetry",
)
const HANDLING_TYPES = typesOf("render-event", "effect-callback", "code-event")
const STATE_TYPES = typesOf("state", "derived")
const RUNNING_IN_PLACE_TYPES = typesOf("render-event", "effect-callback", "code-event", "render-loop")
const RUNNING_IN_PLACE = "in-place"
const UNTRACED_TYPES = typesOf("type-declaration", "import", "file", "deleted")
const STARTING_LATER_TYPES = typesOf(
  "function",
  "hook",
  "component",
  "method",
  "class",
  "root-argument-value",
  "type-declaration",
  "import",
  "component-effect",
  "code-event",
  "render-event",
  "effect-callback",
  "route",
  "resolver",
  "middleware",
)
const RUNNING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>(["call", "render"])
const NAMING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>(["value", "read"])
const NAMING_A_TYPE: StoredCodeBlockSymbol["use"] = "type"

type BlockIndex = Pick<ChainIndex, "blockById">

const blocksOf = (blockIds: readonly string[], { blockById }: BlockIndex): StoredCodeBlock[] =>
  blockIds.flatMap((blockId) => {
    const block = blockById.get(blockId)
    return block === undefined ? [] : [block]
  })

const findBlock = (blockId: string | null, { blockById }: BlockIndex): StoredCodeBlock | null =>
  blockId === null ? null : (blockById.get(blockId) ?? null)

const childrenOf = (block: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => blocksOf(block.childrenBlockIds, index)

const isValue = (block: StoredCodeBlock, index: ChainIndex): boolean => VALUE_TYPES.has(block.type) || index.heldMarkupIds.has(block.id)

const isWrittenInPlace = (block: StoredCodeBlock, index: ChainIndex): boolean => WRITTEN_IN_PLACE_TYPES.has(block.type) && !index.heldMarkupIds.has(block.id)

const listHandedCalls = (block: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] =>
  VALUE_TYPES.has(block.type) ? childrenOf(block, index).filter((child) => HANDED_TYPES.has(child.type)) : []

const isKeepingResult = (block: StoredCodeBlock, index: ChainIndex): boolean => listHandedCalls(block, index).length > 0

const listCallbacks = (handedCall: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] =>
  childrenOf(handedCall, index).filter((child) => child.type === CALLBACK)

const isResultKept = (handedCall: StoredCodeBlock, index: ChainIndex): boolean => {
  const holder = findBlock(handedCall.parentBlockId, index)
  return holder !== null && isKeepingResult(holder, index)
}

const namedIdOf = (symbol: StoredCodeBlockSymbol): string | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null

const runMemberOf = (symbol: StoredCodeBlockSymbol, index: BlockIndex): StoredCodeBlock | null => {
  const member = findBlock(symbol.member?.blockId ?? null, index)
  return member === null || member.type === PROPERTY ? null : member
}

const reachedThrough = (symbol: StoredCodeBlockSymbol, isHandler: boolean, index: ChainIndex): StoredCodeBlock[] => {
  const member = runMemberOf(symbol, index)
  const referenced = member ?? findBlock(namedIdOf(symbol), index)
  if (referenced === null) return []
  const isRun = RUNNING_USES.has(symbol.use) || (isHandler && NAMING_USES.has(symbol.use))
  if (isValue(referenced, index)) return symbol.use === NAMING_A_TYPE && referenced.isAnnotatedAlias !== true ? [] : [referenced]
  const hasUnknownMember = symbol.member !== undefined && member === null
  const isReached = CALLABLE_TYPES.has(referenced.type) ? !hasUnknownMember : referenced.type === ARGUMENT
  return isRun && isReached ? [referenced] : []
}

const isHandedOn = (symbol: StoredCodeBlockSymbol): boolean => symbol.handedToId !== undefined && symbol.handedToId !== null

const isWrittenInCallback = (block: StoredCodeBlock, index: ChainIndex): boolean =>
  isWrittenInPlace(block, index) && findBlock(block.parentBlockId, index)?.type === CALLBACK

const isHandlingBlock = (block: StoredCodeBlock, index: ChainIndex): boolean => {
  if (HANDLING_TYPES.has(block.type) || isWrittenInCallback(block, index)) return true
  const holder = HELD_TYPES.has(block.type) ? findBlock(block.parentBlockId, index) : null
  return holder !== null && isHandlingBlock(holder, index)
}

const listSymbolSteps = (block: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => {
  const isHandling = isHandlingBlock(block, index)
  return block.outerSymbols.flatMap((symbol) => reachedThrough(symbol, isHandling && !isHandedOn(symbol), index))
}

const isStateCallback = (block: StoredCodeBlock, index: BlockIndex): boolean => {
  const stateCall = block.type === CALLBACK ? findBlock(block.parentBlockId, index) : null
  const declaration = stateCall === null ? null : findBlock(stateCall.parentBlockId, index)
  return declaration !== null && STATE_TYPES.has(declaration.type)
}

const isHandlerSlot = (block: StoredCodeBlock, index: BlockIndex): boolean => HANDLING_TYPES.has(block.type) && !isStateCallback(block, index)

const isCalling = (symbol: StoredCodeBlockSymbol, holder: StoredCodeBlock, index: BlockIndex): boolean =>
  RUNNING_USES.has(symbol.use) || (NAMING_USES.has(symbol.use) && !isHandedOn(symbol) && isHandlerSlot(holder, index))

const argumentNamedBy = (symbol: StoredCodeBlockSymbol, index: BlockIndex): StoredCodeBlock | null => {
  const named = runMemberOf(symbol, index) ?? findBlock(namedIdOf(symbol), index)
  return named !== null && named.type === ARGUMENT ? named : null
}

const listArgumentIdsHandedTo = (argument: StoredCodeBlock, index: BlockIndex): string[] =>
  argument.handedFrom.flatMap(({ blockId, symbolIndex }) =>
    blocksOf([blockId], index).flatMap((holder) => argumentNamedBy(holder.outerSymbols[symbolIndex], index)?.id ?? []),
  )

const withArgumentsHandedOn = (pendingIds: readonly string[], index: BlockIndex, calledIds: ReadonlySet<string> = new Set()): ReadonlySet<string> => {
  const arrivingIds = [...new Set(pendingIds)].filter((argumentId) => !calledIds.has(argumentId))
  if (arrivingIds.length === 0) return calledIds
  const handedIds = blocksOf(arrivingIds, index).flatMap((argument) => listArgumentIdsHandedTo(argument, index))
  return withArgumentsHandedOn(handedIds, index, new Set([...calledIds, ...arrivingIds]))
}

const listCalledArgumentIds = (codeBlocks: readonly StoredCodeBlock[], index: BlockIndex): ReadonlySet<string> =>
  withArgumentsHandedOn(
    codeBlocks.flatMap((holder) =>
      holder.outerSymbols.flatMap((symbol) => (isCalling(symbol, holder, index) ? (argumentNamedBy(symbol, index)?.id ?? []) : [])),
    ),
    index,
  )

const listHandedSteps = (argument: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => {
  if (!index.calledArgumentIds.has(argument.id)) return []
  return argument.handedFrom.flatMap(({ blockId, symbolIndex }) =>
    blocksOf([blockId], index).flatMap((holder) => reachedThrough(holder.outerSymbols[symbolIndex], true, index)),
  )
}

const stepsInto = (block: StoredCodeBlock, child: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => {
  if (index.heldMarkupIds.has(child.id)) return [child]
  if (isWrittenInPlace(child, index)) return RUNNING_IN_PLACE_TYPES.has(block.type) || child.name === undefined ? [child] : []
  if (child.type === CALLBACK) return (CALLING_BACK_TYPES.has(block.type) || isRunInPlace(child)) && !isResultKept(block, index) ? [child] : []
  if (child.type === METHOD) return block.type === CLASS ? [child] : []
  if (HANDED_TYPES.has(child.type) && index.returnedIds.has(child.id)) return [child]
  if (child.type === ARGUMENT && isTypedByAnnotatedAlias(child, index)) return [child]
  if (STARTING_LATER_TYPES.has(child.type)) return []
  return isKeepingResult(child, index) ? listHandedCalls(child, index) : [child]
}

const isTypedByAnnotatedAlias = (argument: StoredCodeBlock, index: ChainIndex): boolean =>
  argument.outerSymbols.some((symbol) => symbol.use === NAMING_A_TYPE && findBlock(namedIdOf(symbol), index)?.isAnnotatedAlias === true)

const isRunInPlace = (callback: StoredCodeBlock): boolean => callback.catalogue?.runs === RUNNING_IN_PLACE

const listNestedSteps = (block: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => {
  if (isKeepingResult(block, index)) {
    const callbacks = listHandedCalls(block, index).flatMap((handedCall) => listCallbacks(handedCall, index))
    return block.parentBlockId === null ? [...listHandedCalls(block, index), ...callbacks] : callbacks
  }
  return childrenOf(block, index).flatMap((child) => stepsInto(block, child, index))
}

const isUntraced = (block: StoredCodeBlock, index: ChainIndex): boolean => {
  if (UNTRACED_TYPES.has(block.type)) return true
  const parent = findBlock(block.parentBlockId, index)
  return parent !== null && isUntraced(parent, index)
}

const listSteps = (block: StoredCodeBlock, index: ChainIndex): string[] => {
  if (isUntraced(block, index)) return []
  const handed = block.type === ARGUMENT ? listHandedSteps(block, index) : []
  const stepped = [...listNestedSteps(block, index), ...listSymbolSteps(block, index), ...handed].map((next) => next.id)
  return [...new Set(stepped)].filter((nextId) => nextId !== block.id)
}

const sourceOf = (changed: StoredCodeBlock, index: ChainIndex): StoredCodeBlock => {
  const parent = OWNED_TYPES.has(changed.type) ? findBlock(changed.parentBlockId, index) : null
  return parent === null ? changed : sourceOf(parent, index)
}

const reach = (pending: readonly string[], nextOf: (blockId: string) => readonly string[], reached: ReadonlySet<string> = new Set()): ReadonlySet<string> => {
  const unvisited = [...new Set(pending)].filter((blockId) => !reached.has(blockId))
  if (unvisited.length === 0) return reached
  return reach(unvisited.flatMap(nextOf), nextOf, new Set([...reached, ...unvisited]))
}

const listTops = (
  onChainIds: readonly string[],
  runnerIdsById: ReadonlyMap<string, readonly string[]>,
  nextOf: (blockId: string) => readonly string[],
): string[] => {
  const started = onChainIds.filter((blockId) => (runnerIdsById.get(blockId) ?? []).length === 0)
  const withLoops = (tops: readonly string[]): string[] => {
    const reached = reach(tops, nextOf)
    const unreached = onChainIds.find((blockId) => !reached.has(blockId))
    return unreached === undefined ? [...tops] : withLoops([...tops, unreached])
  }
  return withLoops(started)
}

export interface ChainHints {
  readonly returnedIds: ReadonlySet<string>
  readonly heldMarkupIds: ReadonlySet<string>
}

export const traceChains = (codeBlocks: readonly StoredCodeBlock[], hints: ChainHints): TracedChains => {
  const blockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  const index: ChainIndex = { blockById, ...hints, calledArgumentIds: listCalledArgumentIds(codeBlocks, { blockById }) }
  const stepIdsById = new Map(codeBlocks.map((block) => [block.id, listSteps(block, index)] as const))
  const runs = codeBlocks.flatMap((block) => (stepIdsById.get(block.id) ?? []).map((nextId) => ({ runnerId: block.id, nextId })))
  const runnerIdsById = new Map([...groupBy(runs, (run) => run.nextId)].map(([nextId, running]) => [nextId, running.map((run) => run.runnerId)] as const))
  const sourceIds = [
    ...new Set(
      codeBlocks
        .filter((block) => block.lineOfCodeDiffs !== null && !isUntraced(block, index))
        .map((block) => sourceOf(block, index).id),
    ),
  ]
  const leadingIdsBySource = new Map(sourceIds.map((sourceId) => [sourceId, reach([sourceId], (blockId) => runnerIdsById.get(blockId) ?? [])] as const))
  const leadingIdsById = new Map(
    codeBlocks.map((block) => [block.id, sourceIds.filter((sourceId) => leadingIdsBySource.get(sourceId)?.has(block.id) ?? false)] as const),
  )
  const leadsToChange = (blockId: string): boolean => (leadingIdsById.get(blockId) ?? []).length > 0
  const stepsToChange = (blockId: string): string[] => (stepIdsById.get(blockId) ?? []).filter(leadsToChange)
  const startingIds = codeBlocks.filter((block) => block.type !== ARGUMENT && leadsToChange(block.id)).map((block) => block.id)
  const diffChainIds = listTops(startingIds, runnerIdsById, stepsToChange)
  const onChainIds = reach(diffChainIds, stepsToChange)
  return {
    nextBlockIdsById: new Map(codeBlocks.map((block) => [block.id, onChainIds.has(block.id) ? stepsToChange(block.id) : []] as const)),
    diffSourceIdsById: new Map(codeBlocks.map((block) => [block.id, onChainIds.has(block.id) ? (leadingIdsById.get(block.id) ?? []) : []] as const)),
    diffChainIds,
  }
}
