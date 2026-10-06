export const firstOfEach = <Item>(items: readonly Item[], keyOf: (item: Item) => string): Item[] => {
  const keys = items.map(keyOf)
  const firstIndexByKey = new Map([...keys.entries()].reverse().map(([index, key]) => [key, index] as const))
  return items.filter((_item, index) => firstIndexByKey.get(keys[index]) === index)
}
