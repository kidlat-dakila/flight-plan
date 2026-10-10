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
}

type Types = ReadonlySet<CodeBlockType>

const typesOf = (...types: readonly CodeBlockType[]): Types => new Set(types)

const CALLABLE_TYPES = typesOf("function", "hook", "method", "class")
const ARGUMENT: CodeBlockType = "root-argument-value"
const CALLBACK: CodeBlockType = "effect-callback"
const METHOD: CodeBlockType = "method"
const CLASS: CodeBlockType = "class"
const WRITTEN_IN_PLACE: CodeBlockType = "function"
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
const RUNNING_IN_PLACE_TYPES = typesOf("render-event", "effect-callback", "code-event", "render-loop")
const UNTRACED_TYPES = typesOf("type-declaration", "import", "file")
const STARTING_LATER_TYPES = typesOf(
  "function",
  "hook",
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

const blocksOf = (blockIds: readonly string[], { blockById }: ChainIndex): StoredCodeBlock[] =>
  blockIds.flatMap((blockId) => {
    const block = blockById.get(blockId)
    return block === undefined ? [] : [block]
  })

const findBlock = (blockId: string | null, { blockById }: ChainIndex): StoredCodeBlock | null =>
  blockId === null ? null : (blockById.get(blockId) ?? null)

const childrenOf = (block: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => blocksOf(block.childrenBlockIds, index)

const listHandedCalls = (block: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] =>
  VALUE_TYPES.has(block.type) ? childrenOf(block, index).filter((child) => HANDED_TYPES.has(child.type)) : []

const isKeepingResult = (block: StoredCodeBlock, index: ChainIndex): boolean => listHandedCalls(block, index).length > 0

const listCallbacks = (handedCall: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] =>
  childrenOf(handedCall, index).filter((child) => child.type === CALLBACK)

const isResultKept = (handedCall: StoredCodeBlock, index: ChainIndex): boolean => {
  const holder = findBlock(handedCall.parentBlockId, index)
  return holder !== null && isKeepingResult(holder, index)
}

const referencedIdOf = (symbol: StoredCodeBlockSymbol): string | null => {
  if (symbol.member !== undefined && symbol.member.blockId !== null) return symbol.member.blockId
  return symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null
}

const reachedThrough = (symbol: StoredCodeBlockSymbol, isHandler: boolean, index: ChainIndex): StoredCodeBlock[] => {
  const referenced = findBlock(referencedIdOf(symbol), index)
  if (referenced === null) return []
  const isRun = RUNNING_USES.has(symbol.use) || (isHandler && NAMING_USES.has(symbol.use))
  if (VALUE_TYPES.has(referenced.type)) return symbol.use === NAMING_A_TYPE ? [] : [referenced]
  const hasUnknownMember = symbol.member?.blockId === null
  const isReached = CALLABLE_TYPES.has(referenced.type) ? !hasUnknownMember : referenced.type === ARGUMENT
  return isRun && isReached ? [referenced] : []
}

const isHandedOn = (symbol: StoredCodeBlockSymbol): boolean => symbol.handedToId !== undefined && symbol.handedToId !== null

const isWrittenInCallback = (block: StoredCodeBlock, index: ChainIndex): boolean =>
  block.type === WRITTEN_IN_PLACE && findBlock(block.parentBlockId, index)?.type === CALLBACK

const listSymbolSteps = (block: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => {
  const isHandling = HANDLING_TYPES.has(block.type) || isWrittenInCallback(block, index)
  return block.outerSymbols.flatMap((symbol) => reachedThrough(symbol, isHandling && !isHandedOn(symbol), index))
}

const listHandedSteps = (argument: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] =>
  argument.handedFrom.flatMap(({ blockId, symbolIndex }) =>
    blocksOf([blockId], index).flatMap((holder) => reachedThrough(holder.outerSymbols[symbolIndex], true, index)),
  )

const stepsInto = (block: StoredCodeBlock, child: StoredCodeBlock, index: ChainIndex): StoredCodeBlock[] => {
  if (child.type === WRITTEN_IN_PLACE) return RUNNING_IN_PLACE_TYPES.has(block.type) || child.name === undefined ? [child] : []
  if (child.type === CALLBACK) return CALLING_BACK_TYPES.has(block.type) && !isResultKept(block, index) ? [child] : []
  if (child.type === METHOD) return block.type === CLASS ? [child] : []
  if (HANDED_TYPES.has(child.type) && index.returnedIds.has(child.id)) return [child]
  if (STARTING_LATER_TYPES.has(child.type)) return []
  return isKeepingResult(child, index) ? listHandedCalls(child, index) : [child]
}

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
  const parent = changed.type === ARGUMENT ? findBlock(changed.parentBlockId, index) : null
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

export const traceChains = (codeBlocks: readonly StoredCodeBlock[], returnedIds: ReadonlySet<string>): TracedChains => {
  const index: ChainIndex = { blockById: new Map(codeBlocks.map((block) => [block.id, block] as const)), returnedIds }
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
