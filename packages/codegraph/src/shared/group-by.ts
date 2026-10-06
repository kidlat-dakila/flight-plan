export const groupBy = <Item, Key>(items: readonly Item[], keyOf: (item: Item) => Key): Map<Key, Item[]> => {
  const keys = items.map(keyOf)
  const rankByKey = new Map([...new Set(keys)].map((key, rank) => [key, rank] as const))
  const ordered = items
    .map((item, index) => ({ item, key: keys[index], rank: rankByKey.get(keys[index]) ?? 0, index }))
    .sort((one, two) => one.rank - two.rank || one.index - two.index)
  const starts = ordered.flatMap((one, index) => (index === 0 || ordered[index - 1].rank !== one.rank ? [index] : []))
  return new Map(
    starts.map((start, group) => {
      const end = group + 1 < starts.length ? starts[group + 1] : ordered.length
      return [ordered[start].key, ordered.slice(start, end).map((one) => one.item)] as const
    }),
  )
}
