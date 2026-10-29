import { walkDepthFirst } from "@/shared/reach"

export interface LeafReach<Item> {
  readonly nextOf: (item: Item) => readonly Item[]
  readonly isLeaf: (item: Item) => boolean
  readonly keyOf: (item: Item) => string
}

export const listLeavesReached = <Item>(start: Item, { nextOf, isLeaf, keyOf }: LeafReach<Item>): Item[] => {
  const startKey = keyOf(start)
  const isOpened = (item: Item): boolean => keyOf(item) === startKey || !isLeaf(item)
  const [, ...reached] = walkDepthFirst([start], { nextOf: (item) => (isOpened(item) ? nextOf(item) : []), keyOf })
  return reached.filter(isLeaf)
}
