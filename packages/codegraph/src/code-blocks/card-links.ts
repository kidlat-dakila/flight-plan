import { methodHeadingOf } from "@/code-blocks/libraries/route-cards"
import { firstOfEach } from "@/shared/first-of-each"
import { groupBy } from "@/shared/group-by"
import type { StoredCodeBlock, StoredCodeBlockSymbol } from "./stored-types"
import type { BlockCard, CardKind, CardPart, CodeBlockType } from "./types"

interface LinkIndex {
  readonly blockById: ReadonlyMap<string, StoredCodeBlock>
  readonly childrenById: ReadonlyMap<string, readonly StoredCodeBlock[]>
  readonly blocks: readonly StoredCodeBlock[]
}

type CardById = ReadonlyMap<string, BlockCard>

type Link = readonly [string, BlockCard]

const HOLDER: CardPart = "holder"
const HANDLER: CardPart = "handler"
const SELECTOR: CardPart = "selector"
const THUNK: CardPart = "thunk"
const EXTRA_REDUCER: CardPart = "extra-reducer"
const ROUTE: CardKind = "route"
const STORE: CardKind = "store"
const SELECTORS_HEADING = "SELECTORS"
const NAMING_USES: ReadonlySet<StoredCodeBlockSymbol["use"]> = new Set<StoredCodeBlockSymbol["use"]>(["value", "read"])
const CALL: StoredCodeBlockSymbol["use"] = "call"
const CALLABLE_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["function", "method", "hook"])
const ARGUMENT: CodeBlockType = "root-argument-value"
const PROPERTY: CodeBlockType = "property"
const PARAMETER_TYPES: ReadonlySet<CodeBlockType> = new Set<CodeBlockType>(["variable", "root-argument-value"])
const JOINED_KINDS: readonly CardKind[] = ["router", "store", "api"]
const MAX_ROUNDS = 8
const CLASS: CodeBlockType = "class"
const METHOD: CodeBlockType = "method"
const VIEW_FACTORY = "as_view"
const ANY_METHOD = "ANY"
const NAME_SEPARATOR = "."
const HEADING_BY_VIEW_METHOD: ReadonlyMap<string, string> = new Map([
  ["get", "GET"],
  ["post", "POST"],
  ["put", "PUT"],
  ["patch", "PATCH"],
  ["delete", "DELETE"],
  ["head", "HEAD"],
  ["options", "OPTIONS"],
])

const targetIdOf = (symbol: StoredCodeBlockSymbol): string | null =>
  symbol.type === "internal-code-block" || symbol.type === "external-block" ? symbol.codeBlockId : null

const targetsOf = (block: StoredCodeBlock, uses: ReadonlySet<StoredCodeBlockSymbol["use"]>, { blockById }: LinkIndex): StoredCodeBlock[] =>
  block.outerSymbols.flatMap((symbol) => {
    const targetId = uses.has(symbol.use) ? targetIdOf(symbol) : null
    const target = targetId === null ? undefined : blockById.get(targetId)
    return target === undefined ? [] : [target]
  })

const childrenOf = (block: StoredCodeBlock, { childrenById }: LinkIndex): readonly StoredCodeBlock[] => childrenById.get(block.id) ?? []

const withinOf = (block: StoredCodeBlock, index: LinkIndex): StoredCodeBlock[] => [block, ...childrenOf(block, index).flatMap((child) => withinOf(child, index))]

const parentOf = (block: StoredCodeBlock, { blockById }: LinkIndex): StoredCodeBlock | null =>
  block.parentBlockId === null ? null : (blockById.get(block.parentBlockId) ?? null)

const rootOf = (block: StoredCodeBlock, index: LinkIndex): StoredCodeBlock => {
  const parent = parentOf(block, index)
  return parent === null ? block : rootOf(parent, index)
}

const cardOf = (block: StoredCodeBlock, cardById: CardById): BlockCard | undefined => cardById.get(block.id) ?? block.card

const isHolderOf = (block: StoredCodeBlock, kinds: readonly CardKind[], cardById: CardById): boolean => {
  const card = cardOf(block, cardById)
  return card?.part === HOLDER && kinds.includes(card.kind)
}

const isRootCallable = (block: StoredCodeBlock): boolean => block.parentBlockId === null && CALLABLE_TYPES.has(block.type)

const selectorCardOf = (holder: StoredCodeBlock, cardById: CardById): BlockCard => ({
  library: cardOf(holder, cardById)?.library ?? "",
  kind: STORE,
  part: SELECTOR,
  heading: SELECTORS_HEADING,
  groupKey: null,
  ownerId: holder.id,
})

const headingOfHandler = (card: BlockCard, handler: StoredCodeBlock): string | null => {
  const method = handler.catalogue?.method ?? null
  return card.heading === ANY_METHOD && method !== null ? methodHeadingOf(method) : card.heading
}

const linkNamedHandlers = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] =>
  index.blocks.flatMap((slot) => {
    const card = cardOf(slot, cardById)
    if (card?.kind !== ROUTE || card.part !== HANDLER || slot.parentBlockId === null || childrenOf(slot, index).length > 0) return []
    const ownerId = slot.parentBlockId
    return targetsOf(slot, NAMING_USES, index).filter(isRootCallable).map((handler) => [handler.id, { ...card, heading: headingOfHandler(card, handler), ownerId }] as const)
  })

const isMakingView = (symbol: StoredCodeBlockSymbol): boolean => symbol.use === CALL && (symbol.member?.path ?? []).slice(-1)[0] === VIEW_FACTORY

const viewClassOf = (slot: StoredCodeBlock, index: LinkIndex): StoredCodeBlock | undefined =>
  withinOf(slot, index)
    .flatMap((inside) => inside.outerSymbols.filter(isMakingView))
    .map((symbol) => index.blockById.get(targetIdOf(symbol) ?? ""))
    .find((target) => target?.type === CLASS)

const viewMethodNameOf = (method: StoredCodeBlock): string => (method.name ?? "").split(NAME_SEPARATOR).slice(-1)[0]

const linkViewMethods = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] =>
  index.blocks.flatMap((slot) => {
    const card = cardOf(slot, cardById)
    const view = card?.kind === ROUTE && card.part === HANDLER && slot.parentBlockId !== null ? viewClassOf(slot, index) : undefined
    if (card === undefined || view === undefined) return []
    const ownerId = slot.parentBlockId
    const routed = childrenOf(view, index)
      .filter((child) => child.type === METHOD)
      .flatMap((method) => {
        const heading = HEADING_BY_VIEW_METHOD.get(viewMethodNameOf(method))
        return heading === undefined ? [] : [[method.id, { ...card, heading, ownerId }] as const]
      })
    return routed.length === 0 ? [[view.id, { ...card, ownerId }] as const] : routed
  })

const linkHandedSelectors = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] =>
  index.blocks.flatMap((caller) => {
    const holder = targetsOf(caller, new Set([CALL]), index).find((target) => isHolderOf(target, [STORE], cardById))
    if (holder === undefined) return []
    return withinOf(caller, index)
      .flatMap((inside) => targetsOf(inside, NAMING_USES, index))
      .filter((target) => isRootCallable(target) && target.id !== holder.id)
      .map((selector) => [selector.id, selectorCardOf(holder, cardById)] as const)
  })

const firstArgumentOf = (block: StoredCodeBlock, index: LinkIndex): StoredCodeBlock | null => childrenOf(block, index).find((child) => child.type === ARGUMENT) ?? null

const holderByKeyOf = (index: LinkIndex, cardById: CardById): ReadonlyMap<string, StoredCodeBlock> =>
  new Map(
    index.blocks.flatMap((block) => {
      const card = cardOf(block, cardById)
      return card?.part === HOLDER && card.kind === STORE && card.groupKey !== null ? [[card.groupKey, block] as const] : []
    }),
  )

const linkKeyedSelectors = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] => {
  const holderByKey = holderByKeyOf(index, cardById)
  return index.blocks.filter(isRootCallable).flatMap((reader) => {
    const argument = firstArgumentOf(reader, index)
    const holder = argument === null ? undefined : childrenOf(argument, index).map((key) => holderByKey.get(key.name ?? "")).find((found) => found !== undefined)
    return holder === undefined ? [] : [[reader.id, selectorCardOf(holder, cardById)] as const]
  })
}

const holderReadIn = (block: StoredCodeBlock, index: LinkIndex, holderByKey: ReadonlyMap<string, StoredCodeBlock>): StoredCodeBlock | undefined =>
  withinOf(block, index)
    .flatMap((inside) => inside.outerSymbols)
    .filter((symbol) => NAMING_USES.has(symbol.use) && PARAMETER_TYPES.has(index.blockById.get(targetIdOf(symbol) ?? "")?.type ?? "deleted"))
    .map((symbol) => holderByKey.get(symbol.member?.path[0] ?? ""))
    .find((holder) => holder !== undefined)

const linkReadingSelectors = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] => {
  const holderByKey = holderByKeyOf(index, cardById)
  return index.blocks.flatMap((selector) => {
    const card = cardOf(selector, cardById)
    const holder = card?.part === SELECTOR && card.ownerId === null ? holderReadIn(selector, index, holderByKey) : undefined
    return holder === undefined || card === undefined ? [] : [[selector.id, { ...card, ownerId: holder.id }] as const]
  })
}

const ownerOfSelectorsIn = (block: StoredCodeBlock, index: LinkIndex, cardById: CardById): string | null =>
  withinOf(block, index)
    .flatMap((inside) => targetsOf(inside, NAMING_USES, index))
    .map((target) => cardOf(target, cardById))
    .find((card) => card?.part === SELECTOR && card.ownerId !== null)?.ownerId ?? null

const linkBuiltSelectors = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] =>
  index.blocks.flatMap((selector) => {
    const card = cardOf(selector, cardById)
    if (card?.part !== SELECTOR || card.ownerId !== null) return []
    const ownerId = ownerOfSelectorsIn(selector, index, cardById)
    return ownerId === null ? [] : [[selector.id, { ...card, ownerId }] as const]
  })

const linkHandledThunks = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] =>
  index.blocks.flatMap((handling) => {
    const card = cardOf(handling, cardById)
    const call = card?.part === EXTRA_REDUCER ? parentOf(handling, index) : null
    if (call === null) return []
    const ownerId = rootOf(handling, index).id
    return targetsOf(call, NAMING_USES, index).flatMap((thunk) => {
      const thunkCard = cardOf(thunk, cardById)
      return thunkCard?.part === THUNK && thunkCard.ownerId === null ? [[thunk.id, { ...thunkCard, ownerId }] as const] : []
    })
  })

const holderNamedAround = (block: StoredCodeBlock, index: LinkIndex, cardById: CardById, kind: CardKind): StoredCodeBlock | null => {
  const parent = parentOf(block, index)
  if (parent === null) return null
  const besides = [parent, ...childrenOf(parent, index).filter((child) => child.id !== block.id).flatMap((child) => withinOf(child, index))]
  const holder = besides.flatMap((inside) => targetsOf(inside, new Set([CALL, ...NAMING_USES]), index)).find((target) => isHolderOf(target, [kind], cardById))
  return holder ?? holderNamedAround(parent, index, cardById, kind)
}

const linkPartsBeside = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] =>
  index.blocks.flatMap((part) => {
    const card = cardOf(part, cardById)
    if (card === undefined || card.part === HOLDER || card.ownerId !== null || card.kind === ROUTE || part.parentBlockId === null) return []
    if (isHolderOf(rootOf(part, index), [card.kind], cardById)) return []
    const holder = holderNamedAround(part, index, cardById, card.kind)
    return holder === null ? [] : [[part.id, { ...card, ownerId: holder.id }] as const]
  })

interface PendingBlocks {
  readonly block: StoredCodeBlock
  readonly below: PendingBlocks | null
}

const propertiesOf = (block: StoredCodeBlock, index: LinkIndex): readonly StoredCodeBlock[] => childrenOf(block, index).filter((child) => child.type === PROPERTY)

const pushAll = (blocks: readonly StoredCodeBlock[], below: PendingBlocks | null): PendingBlocks | null =>
  blocks.reduceRight<PendingBlocks | null>((pending, block) => ({ block, below: pending }), below)

function* walkLeaves(block: StoredCodeBlock, index: LinkIndex): Generator<StoredCodeBlock> {
  for (let pending: PendingBlocks | null = { block, below: null }; pending !== null;) {
    const properties = propertiesOf(pending.block, index)
    if (properties.length === 0) yield pending.block
    pending = pushAll(properties, pending.below)
  }
}

const leavesOf = (block: StoredCodeBlock, index: LinkIndex): StoredCodeBlock[] => [...walkLeaves(block, index)]

const linkJoiners = (index: LinkIndex, cardById: CardById): (readonly [string, BlockCard])[] =>
  index.blocks.flatMap((root) => {
    const children = root.parentBlockId === null && cardOf(root, cardById) === undefined ? childrenOf(root, index) : []
    if (children.length === 0 || children.some((child) => child.type !== PROPERTY)) return []
    const joined = children.flatMap((child) => leavesOf(child, index)).map((leaf) => targetsOf(leaf, NAMING_USES, index).find((target) => isHolderOf(target, JOINED_KINDS, cardById)))
    const first = joined[0] === undefined ? undefined : cardOf(joined[0], cardById)
    if (first === undefined || joined.some((holder) => holder === undefined)) return []
    return [[root.id, { library: first.library, kind: first.kind, part: HOLDER, heading: null, groupKey: null, ownerId: null }] as const]
  })

const LINKS = [linkJoiners, linkNamedHandlers, linkViewMethods, linkHandedSelectors, linkKeyedSelectors, linkReadingSelectors, linkBuiltSelectors, linkHandledThunks, linkPartsBeside]

const canTake = (block: StoredCodeBlock | undefined, linked: BlockCard, cardById: CardById): boolean => {
  if (block === undefined) return false
  const card = cardOf(block, cardById)
  return card === undefined || (card.ownerId === null && card.part === linked.part)
}

type CardAt = (block: StoredCodeBlock) => BlockCard | undefined

const aroundIdOf = (blockId: string, index: LinkIndex, cardAt: CardAt): string | null => {
  const block = index.blockById.get(blockId)
  return block === undefined ? null : (cardAt(block)?.ownerId ?? block.parentBlockId)
}

function* walkAround(startId: string, index: LinkIndex, cardAt: CardAt): Generator<string> {
  const maxSteps = index.blocks.length
  for (let aroundId: string | null = startId, steps = 0; aroundId !== null && steps < maxSteps; aroundId = aroundIdOf(aroundId, index, cardAt), steps += 1) yield aroundId
}

const leadsBackTo = (blockId: string, startId: string, index: LinkIndex, cardAt: CardAt): boolean => [...walkAround(startId, index, cardAt)].includes(blockId)

const closesLoop = ([blockId, linked]: Link, index: LinkIndex, cardAt: CardAt): boolean => linked.ownerId !== null && leadsBackTo(blockId, linked.ownerId, index, cardAt)

const takeLink = (index: LinkIndex, cardById: CardById) => (taken: CardById, link: Link): CardById => {
  const cardAt: CardAt = (block) => taken.get(block.id) ?? cardOf(block, cardById)
  return taken.has(link[0]) || closesLoop(link, index, cardAt) ? taken : new Map([...taken, link])
}

const isUncardedRoot = ([blockId]: Link, index: LinkIndex, cardById: CardById): boolean => {
  const block = index.blockById.get(blockId)
  return block?.parentBlockId === null && cardOf(block, cardById) === undefined
}

const withoutOwner = ([blockId, linked]: Link): Link => [blockId, { ...linked, ownerId: null }]

const acceptedOf = (found: readonly Link[], index: LinkIndex, cardById: CardById): Link[] => {
  const taken = found.reduce<CardById>(takeLink(index, cardById), new Map())
  const refused = firstOfEach(found.filter(([blockId]) => !taken.has(blockId)), ([blockId]) => blockId)
  return [...taken, ...refused.filter((link) => isUncardedRoot(link, index, cardById)).map(withoutOwner)]
}

const linkRound = (index: LinkIndex, cardById: CardById): CardById => {
  const found = LINKS.flatMap((link) => link(index, cardById)).filter(([blockId, linked]) => canTake(index.blockById.get(blockId), linked, cardById))
  const fresh = acceptedOf(found, index, cardById)
  return fresh.length === 0 ? cardById : new Map([...cardById, ...fresh])
}

const linkUntilSettled = (index: LinkIndex, cardById: CardById, round: number): CardById => {
  const next = linkRound(index, cardById)
  return next === cardById || round >= MAX_ROUNDS ? next : linkUntilSettled(index, next, round + 1)
}

export const linkCards = (blocks: readonly StoredCodeBlock[]): StoredCodeBlock[] => {
  const index: LinkIndex = {
    blocks,
    blockById: new Map(blocks.map((block) => [block.id, block] as const)),
    childrenById: groupBy(blocks.filter((block) => block.parentBlockId !== null), (block) => block.parentBlockId ?? ""),
  }
  const cardById = linkUntilSettled(index, new Map(), 0)
  return blocks.map((block) => {
    const card = cardById.get(block.id)
    return card === undefined ? block : { ...block, card }
  })
}
