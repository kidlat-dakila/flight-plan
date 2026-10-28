import { firstOfEach } from "@/shared/first-of-each"

export interface LeafReach<Item> {
  readonly nextOf: (item: Item) => readonly Item[]
  readonly isLeaf: (item: Item) => boolean
  readonly keyOf: (item: Item) => string
}

interface Pending<Item> {
  readonly item: Item
  readonly below: Pending<Item> | null
}

const pushAll = <Item>(items: readonly Item[], below: Pending<Item> | null): Pending<Item> | null =>
  items.reduceRight<Pending<Item> | null>((pending, item) => ({ item, below: pending }), below)

function* walkLeaves<Item>(start: Item, { nextOf, isLeaf, keyOf }: LeafReach<Item>): Generator<Item> {
  for (let pending = pushAll(nextOf(start), null), openedKeys: ReadonlySet<string> = new Set([keyOf(start)]); pending !== null;) {
    const { item, below } = pending
    const isItemLeaf = isLeaf(item)
    if (isItemLeaf) yield item
    const isOpened = !isItemLeaf && !openedKeys.has(keyOf(item))
    openedKeys = isOpened ? new Set([...openedKeys, keyOf(item)]) : openedKeys
    pending = isOpened ? pushAll(nextOf(item), below) : below
  }
}

export const listLeavesReached = <Item>(start: Item, reach: LeafReach<Item>): Item[] => firstOfEach([...walkLeaves(start, reach)], reach.keyOf)
