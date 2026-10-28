export interface ItemReach<Item> {
  readonly nextOf: (item: Item) => readonly Item[]
  readonly keyOf: (item: Item) => string
}

interface Pending<Item> {
  readonly item: Item
  readonly below: Pending<Item> | null
}

const pushAll = <Item>(items: readonly Item[], below: Pending<Item> | null): Pending<Item> | null =>
  items.reduceRight<Pending<Item> | null>((pending, item) => ({ item, below: pending }), below)

const isFirstSeen = (seenKeys: Set<string>, key: string): boolean => {
  if (seenKeys.has(key)) return false
  // eslint-disable-next-line functional/immutable-data -- one local set keeps every walk linear; a copied set per step made the walks quadratic
  seenKeys.add(key)
  return true
}

export function* walkDepthFirst<Item>(starts: readonly Item[], { nextOf, keyOf }: ItemReach<Item>): Generator<Item> {
  const seenKeys = new Set<string>()
  for (let pending = pushAll(starts, null); pending !== null;) {
    const { item, below } = pending
    const isFirst = isFirstSeen(seenKeys, keyOf(item))
    if (isFirst) yield item
    pending = isFirst ? pushAll(nextOf(item), below) : below
  }
}

function* walkLevels<Item>(starts: readonly Item[], { nextOf, keyOf }: ItemReach<Item>, seenKeys: Set<string>): Generator<Item> {
  for (let level = starts; level.length > 0;) {
    const arriving = level.filter((item) => isFirstSeen(seenKeys, keyOf(item)))
    yield* arriving
    level = arriving.flatMap(nextOf)
  }
}

export function* walkBreadthFirstInTurns<Item>(startGroups: readonly (readonly Item[])[], reach: ItemReach<Item>): Generator<Item> {
  const seenKeys = new Set<string>()
  for (const starts of startGroups) yield* walkLevels(starts, reach, seenKeys)
}

export const walkBreadthFirst = <Item>(starts: readonly Item[], reach: ItemReach<Item>): Generator<Item> => walkBreadthFirstInTurns([starts], reach)
