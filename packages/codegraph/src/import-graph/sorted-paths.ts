const compareCodeUnits = (one: string, two: string): number => {
  if (one === two) return 0
  return one < two ? -1 : 1
}

export const sortedPaths = (paths: Iterable<string>): string[] => [...new Set(paths)].sort(compareCodeUnits)

export const sortedByPath = <Item>(items: readonly Item[], pathOf: (item: Item) => string): Item[] =>
  [...items].sort((one, two) => compareCodeUnits(pathOf(one), pathOf(two)))
