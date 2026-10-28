import { walkDepthFirst } from "@/shared/reach"

export interface ChainReach<Item> {
  readonly nextOf: (item: Item) => Item | null
  readonly keyOf: (item: Item) => string
}

export const endOfChain = <Item>(start: Item, { nextOf, keyOf }: ChainReach<Item>): Item => {
  const linked = [...walkDepthFirst([start], { nextOf: (item) => [nextOf(item)].filter((next) => next !== null), keyOf })]
  return linked[linked.length - 1] ?? start
}
