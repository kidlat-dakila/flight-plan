const HALF = 2

export const mapInSequence = async <Item, Mapped>(items: readonly Item[], map: (item: Item) => Promise<Mapped>): Promise<Mapped[]> => {
  if (items.length === 0) return []
  if (items.length === 1) return [await map(items[0])]
  const middle = Math.ceil(items.length / HALF)
  const left = await mapInSequence(items.slice(0, middle), map)
  const right = await mapInSequence(items.slice(middle), map)
  return [...left, ...right]
}
