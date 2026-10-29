import type { CatalogueLibrary, SlotPosition } from "@/catalogue/types"
import type { ReferenceDetails } from "./link-references"
import { WRITTEN_NOWHERE, type HandingSlot, type WrittenAt } from "./reading"
import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { CodeBlockType } from "./types"

type Places = readonly HandingSlot[]

interface ProvidingMember {
  readonly name: string
  readonly valueAt: Places
}

interface ContextMaker {
  readonly specifiers: readonly string[]
  readonly name: string
  readonly valueAt: Places | null
  readonly providingMembers: readonly ProvidingMember[]
  readonly readingMembers: readonly string[]
}

interface KeyedCall {
  readonly specifiers: readonly string[]
  readonly name: string
  readonly keyAt: Places
  readonly valueAt: Places
}

interface OriginIndex {
  readonly codeBlocks: readonly StoredCodeBlock[]
  readonly blockById: ReadonlyMap<string, StoredCodeBlock>
  readonly details: ReferenceDetails
  readonly contextMakers: readonly ContextMaker[]
  readonly keyedProviders: readonly KeyedCall[]
  readonly readers: readonly KeyedCall[]
}

interface HeldSymbol {
  readonly symbol: StoredCodeBlockSymbol
  readonly holder: StoredCodeBlock
}

type Seen = ReadonlySet<string>

interface Followed {
  readonly blockId: string
  readonly path: readonly string[]
}

type FollowedChain = readonly Followed[]

const VALUE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["external-value", "root-variable", "state", "derived", "variable"])
const WRITTEN_MEMBER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component", "property"])
const CLASS_MEMBER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["method", "property"])
const CALLABLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "hook", "component"])
const NAMING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>(["value", "read"])
const MARKUP: CodeBlockType = "render"
const CLASS: CodeBlockType = "class"
const TYPE_USE: StoredCodeBlockSymbol["use"] = "type"
const MEMBER_SEPARATOR = "."
const NO_PLACES: Places = []
const NOTHING_FOLLOWED: FollowedChain = []
const DEEPEST_FOLLOW = 64

const placesOf = (position: SlotPosition | undefined): Places => {
  if (position === undefined) return NO_PLACES
  return typeof position === "string" || typeof position === "number" ? [position] : position
}

const blocksOf = (blockIds: readonly string[], { blockById }: OriginIndex): StoredCodeBlock[] =>
  blockIds.flatMap((blockId) => {
    const block = blockById.get(blockId)
    return block === undefined ? [] : [block]
  })

const referencedBlockOf = (symbol: StoredCodeBlockSymbol, { blockById }: OriginIndex): StoredCodeBlock | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? (blockById.get(symbol.codeBlockId) ?? null) : null

const lastOf = (path: readonly string[]): string | null => (path.length === 0 ? null : path[path.length - 1])

const listContextMakers = (libraries: readonly CatalogueLibrary[]): ContextMaker[] =>
  libraries.flatMap(({ specifiers, patterns }) =>
    patterns.flatMap((pattern) => {
      if (pattern.kind !== "factory") return []
      const providingMembers = pattern.methods.flatMap((method) =>
        method.kind === "element" && method.provides !== undefined ? [{ name: method.name, valueAt: placesOf(method.provides.valueAt) }] : [])
      const readingMembers = pattern.methods.flatMap((method) => (method.kind === "element" && method.reads !== undefined ? [method.name] : []))
      const valueAt = pattern.provides === undefined ? null : placesOf(pattern.provides.valueAt)
      return valueAt !== null || providingMembers.length > 0 ? [{ specifiers, name: pattern.name, valueAt, providingMembers, readingMembers }] : []
    }),
  )

const listKeyedProviders = (libraries: readonly CatalogueLibrary[]): KeyedCall[] =>
  libraries.flatMap(({ specifiers, patterns }) =>
    patterns.flatMap((pattern) =>
      pattern.kind === "call" && pattern.provides?.keyAt !== undefined
        ? [{ specifiers, name: pattern.name, keyAt: placesOf(pattern.provides.keyAt), valueAt: placesOf(pattern.provides.valueAt) }]
        : []),
  )

const listReaders = (libraries: readonly CatalogueLibrary[]): KeyedCall[] =>
  libraries.flatMap(({ specifiers, patterns }) =>
    patterns.flatMap((pattern) =>
      pattern.kind === "call" && pattern.reads?.keyAt !== undefined ? [{ specifiers, name: pattern.name, keyAt: placesOf(pattern.reads.keyAt), valueAt: NO_PLACES }] : []),
  )

const isCallOf = (symbol: StoredCodeBlockSymbol, { specifiers, name }: Pick<KeyedCall, "specifiers" | "name">): boolean => {
  if (symbol.type !== "unopened-import" || symbol.use !== "call" || !specifiers.includes(symbol.specifier)) return false
  return symbol.importedName === name || lastOf(symbol.member?.path ?? []) === name
}

const writtenAtOf = (symbol: StoredCodeBlockSymbol, { details }: OriginIndex): WrittenAt => details.writtenAtBySymbol.get(symbol) ?? WRITTEN_NOWHERE

const isWrittenAt = (symbol: StoredCodeBlockSymbol, places: Places, index: OriginIndex): boolean => {
  const { slot } = writtenAtOf(symbol, index)
  return slot !== null && places.includes(slot)
}

const makerOf = (context: StoredCodeBlock, { contextMakers }: OriginIndex): ContextMaker | null =>
  contextMakers.find((maker) => context.outerSymbols.some((symbol) => isCallOf(symbol, maker))) ?? null

const providedAtBy = (symbol: StoredCodeBlockSymbol, contextId: string, { valueAt, providingMembers }: ContextMaker): Places | null => {
  if (symbol.use !== "render" || (symbol.type !== "internal-code-block" && symbol.type !== "external-block") || symbol.codeBlockId !== contextId) return null
  const path = symbol.member?.path ?? []
  if (path.length === 0) return valueAt
  return path.length === 1 ? (providingMembers.find((member) => member.name === path[0])?.valueAt ?? null) : null
}

const heldOutsideMarkup = (block: StoredCodeBlock, index: OriginIndex): HeldSymbol[] => [
  ...block.outerSymbols.map((symbol) => ({ symbol, holder: block })),
  ...blocksOf(block.childrenBlockIds, index)
    .filter((child) => child.type !== MARKUP)
    .flatMap((child) => heldOutsideMarkup(child, index)),
]

const heldAt = (holder: StoredCodeBlock, places: Places, index: OriginIndex): HeldSymbol[] =>
  heldOutsideMarkup(holder, index).filter(({ symbol }) => NAMING_USES.has(symbol.use) && isWrittenAt(symbol, places, index))

const listProvidedByElement = (context: StoredCodeBlock, index: OriginIndex): HeldSymbol[] => {
  const maker = makerOf(context, index)
  if (maker === null) return []
  return index.codeBlocks
    .filter((block) => block.type === MARKUP)
    .flatMap((provider) => {
      const valueAt = provider.outerSymbols.flatMap((symbol) => providedAtBy(symbol, context.id, maker) ?? [])
      return valueAt.length === 0 ? [] : heldAt(provider, valueAt, index)
    })
}

const isKeyOf = (symbol: StoredCodeBlockSymbol, keyId: string, keyAt: Places, index: OriginIndex): boolean =>
  NAMING_USES.has(symbol.use) && referencedBlockOf(symbol, index)?.id === keyId && isWrittenAt(symbol, keyAt, index)

const listProvidedByCall = (key: StoredCodeBlock, index: OriginIndex): HeldSymbol[] =>
  index.codeBlocks.flatMap((holder) => {
    const provider = index.keyedProviders.find((candidate) => holder.outerSymbols.some((symbol) => isCallOf(symbol, candidate)))
    const isProvidingKey = provider !== undefined && holder.outerSymbols.some((symbol) => isKeyOf(symbol, key.id, provider.keyAt, index))
    return provider === undefined || !isProvidingKey ? [] : heldAt(holder, provider.valueAt, index)
  })

const isReadAsContext = ({ symbol, holder }: HeldSymbol, index: OriginIndex): boolean =>
  index.readers.some((reader) => holder.outerSymbols.some((other) => isCallOf(other, reader)) && isWrittenAt(symbol, reader.keyAt, index))

const heldWithin = (block: StoredCodeBlock, index: OriginIndex): StoredCodeBlock[] => [
  block,
  ...blocksOf(block.childrenBlockIds, index).flatMap((child) => heldWithin(child, index)),
]

const contentOf = (block: StoredCodeBlock, index: OriginIndex): HeldSymbol[] => {
  const holders = VALUE_TYPES.has(block.type) ? heldWithin(block, index) : [block]
  return holders.flatMap((holder) => holder.outerSymbols.map((symbol) => ({ symbol, holder })))
}

const startsWith = (path: readonly string[], keys: readonly string[]): boolean =>
  keys.length <= path.length && keys.every((key, position) => path[position] === key)

const isSamePath = (one: readonly string[], other: readonly string[]): boolean => one.length === other.length && startsWith(one, other)

const isFollowedAgain = (block: StoredCodeBlock, path: readonly string[], chain: FollowedChain): boolean =>
  chain.some((followed) => followed.blockId === block.id && (followed.path.length < path.length || isSamePath(followed.path, path)))

function firstFound<Item>(items: readonly Item[], find: (item: Item) => string | null): string | null {
  return items.reduce<string | null>((found, item) => found ?? find(item), null)
}

const listBases = (owner: StoredCodeBlock, index: OriginIndex): StoredCodeBlock[] =>
  owner.outerSymbols.flatMap((symbol) => {
    const base = writtenAtOf(symbol, index).isBase ? referencedBlockOf(symbol, index) : null
    return base?.type === CLASS ? [base] : []
  })

function findMethod(name: string, owner: StoredCodeBlock, index: OriginIndex, climbed: Seen): string | null {
  if (climbed.has(owner.id)) return null
  const own = heldWithin(owner, index).find((inner) => CLASS_MEMBER_TYPES.has(inner.type) && inner.name === [owner.name, name].join(MEMBER_SEPARATOR))
  return own?.id ?? firstFound(listBases(owner, index), (base) => findMethod(name, base, index, new Set([...climbed, owner.id])))
}

const findWrittenMember = (path: readonly string[], block: StoredCodeBlock, index: OriginIndex): string | null => {
  if (block.type === CLASS) return findMethod(path[0], block, index, new Set())
  const within = heldWithin(block, index).filter((inner) => inner.id !== block.id)
  const written = within
    .filter((inner) => WRITTEN_MEMBER_TYPES.has(inner.type))
    .map((inner) => ({ id: inner.id, keys: index.details.memberPathById.get(inner.id) ?? [] }))
    .filter(({ keys }) => keys.length > 0 && startsWith(path, keys))
  const longest = written.reduce<{ id: string, keys: readonly string[] } | null>((found, one) => (found === null || one.keys.length > found.keys.length ? one : found), null)
  return longest?.id ?? within.find((inner) => CALLABLE_TYPES.has(inner.type) && inner.name === path[0] && !index.details.memberPathById.has(inner.id))?.id ?? null
}

function followPath(path: readonly string[], block: StoredCodeBlock, index: OriginIndex, chain: FollowedChain): string | null {
  if (path.length === 0 || chain.length >= DEEPEST_FOLLOW || isFollowedAgain(block, path, chain)) return null
  const followed = [...chain, { blockId: block.id, path }]
  return findWrittenMember(path, block, index) ?? firstFound(contentOf(block, index), (held) => followSymbol(path, held, index, followed))
}

function followNamed(path: readonly string[], held: HeldSymbol, index: OriginIndex, chain: FollowedChain): string | null {
  const referenced = referencedBlockOf(held.symbol, index)
  if (referenced === null) return null
  const provided = VALUE_TYPES.has(referenced.type) && isReadAsContext(held, index)
    ? firstFound([...listProvidedByElement(referenced, index), ...listProvidedByCall(referenced, index)], (given) => followSymbol(path, given, index, chain))
    : null
  if (provided !== null) return provided
  if (path.length === 0) return referenced.id
  return VALUE_TYPES.has(referenced.type) ? followPath(path, referenced, index, chain) : null
}

function followSymbol(path: readonly string[], held: HeldSymbol, index: OriginIndex, chain: FollowedChain): string | null {
  const { symbol } = held
  const { keyPath } = writtenAtOf(symbol, index)
  if (symbol.use === "type" || !startsWith(path, keyPath)) return null
  const rest = path.slice(keyPath.length)
  if (NAMING_USES.has(symbol.use)) return followNamed([...(symbol.member?.path ?? []), ...rest], held, index, chain)
  const called = referencedBlockOf(symbol, index)
  const isMaking = called !== null && (CALLABLE_TYPES.has(called.type) || called.type === CLASS || VALUE_TYPES.has(called.type)) && symbol.member === undefined
  return isMaking ? followPath(rest, called, index, chain) : null
}

const followThroughReader = (path: readonly string[], context: StoredCodeBlock, index: OriginIndex): string | null => {
  const isReading = makerOf(context, index)?.readingMembers.includes(path[0]) ?? false
  if (!isReading) return null
  const provided = [...listProvidedByElement(context, index), ...listProvidedByCall(context, index)]
  return firstFound(provided, (given) => followSymbol(path.slice(1), given, index, NOTHING_FOLLOWED))
}

const classOfType = (block: StoredCodeBlock, index: OriginIndex): StoredCodeBlock | null =>
  block.outerSymbols
    .filter((symbol) => symbol.use === TYPE_USE)
    .map((symbol) => referencedBlockOf(symbol, index))
    .find((typed) => typed?.type === CLASS) ?? null

const findTypedMethod = (path: readonly string[], block: StoredCodeBlock, index: OriginIndex): string | null => {
  const typed = classOfType(block, index)
  return typed === null ? null : findMethod(path[0], typed, index, new Set())
}

const withMemberFollowed = (symbol: StoredCodeBlockSymbol, index: OriginIndex): StoredCodeBlockSymbol => {
  const { member } = symbol
  const referenced = referencedBlockOf(symbol, index)
  if (member?.blockId !== null || symbol.use === TYPE_USE || referenced === null) return symbol
  if (referenced.type === CLASS) return { ...symbol, member: { ...member, blockId: findMethod(member.path[0], referenced, index, new Set()) } }
  const followed = VALUE_TYPES.has(referenced.type) ? (followThroughReader(member.path, referenced, index) ?? followPath(member.path, referenced, index, NOTHING_FOLLOWED)) : null
  const blockId = followed ?? findTypedMethod(member.path, referenced, index)
  return blockId === null && !VALUE_TYPES.has(referenced.type) ? symbol : { ...symbol, member: { ...member, blockId } }
}

export const followMembers = (codeBlocks: readonly StoredCodeBlock[], details: ReferenceDetails, libraries: readonly CatalogueLibrary[]): StoredCodeBlock[] => {
  const index: OriginIndex = {
    codeBlocks,
    blockById: new Map(codeBlocks.map((block) => [block.id, block] as const)),
    details,
    contextMakers: listContextMakers(libraries),
    keyedProviders: listKeyedProviders(libraries),
    readers: listReaders(libraries),
  }
  return codeBlocks.map((block) => ({ ...block, outerSymbols: block.outerSymbols.map((symbol) => withMemberFollowed(symbol, index)) }))
}
