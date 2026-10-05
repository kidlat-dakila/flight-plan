const compareCodeUnits = (one: string, two: string): number => {
  if (one === two) return 0
  return one < two ? -1 : 1
}

export const sortedPaths = (paths: Iterable<string>): string[] => [...new Set(paths)].sort(compareCodeUnits)
