const HALF = 2

export const mapInSequence = async <Item, Mapped>(items: readonly Item[], map: (item: Item) => Promise<Mapped>): Promise<Mapped[]> => {
  if (items.length === 0) return []
  if (items.length === 1) return [await map(items[0])]
  const middle = Math.ceil(items.length / HALF)
  const left = await mapInSequence(items.slice(0, middle), map)
  const right = await mapInSequence(items.slice(middle), map)
  return [...left, ...right]
}

export const someInSequence = async <Item>(items: readonly Item[], test: (item: Item) => Promise<boolean>, from = 0): Promise<boolean> => {
  if (from >= items.length) return false
  return (await test(items[from])) || someInSequence(items, test, from + 1)
}

export const findInSequence = async <Item, Found>(
  items: readonly Item[],
  find: (item: Item) => Promise<Found | null>,
  from = 0,
): Promise<Found | null> => {
  if (from >= items.length) return null
  return (await find(items[from])) ?? findInSequence(items, find, from + 1)
}

export const reduceInSequence = async <Item, Held>(
  items: readonly Item[],
  step: (held: Held, item: Item) => Promise<Held>,
  initial: Held,
  from = 0,
): Promise<Held> => {
  if (from >= items.length) return initial
  return reduceInSequence(items, step, await step(initial, items[from]), from + 1)
}
