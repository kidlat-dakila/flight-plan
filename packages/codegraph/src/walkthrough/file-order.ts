import type { SourceFile, WalkthroughOrder } from "@flightplan/configurations"

export interface OrderedFile {
  readonly path: string
  readonly isCoreChange: boolean
  readonly isInSpotlight: boolean
}

type UsedPaths = ReadonlyMap<string, ReadonlySet<string>>

type MustFollow = (file: string, other: string) => boolean

const directUsesOf = (sources: readonly SourceFile[]): UsedPaths =>
  new Map(sources.map((source) => [
    source.path,
    new Set(source.references.filter((reference) => !reference.isLibrary && reference.path !== source.path).map((reference) => reference.path)),
  ] as const))

const reachFrom = (pending: readonly string[], directUses: UsedPaths, reached: ReadonlySet<string>): ReadonlySet<string> => {
  const unvisited = [...new Set(pending)].filter((path) => !reached.has(path))
  if (unvisited.length === 0) return reached
  return reachFrom(unvisited.flatMap((path) => [...(directUses.get(path) ?? [])]), directUses, new Set([...reached, ...unvisited]))
}

export const listUsedPaths = (sources: readonly SourceFile[]): UsedPaths => {
  const directUses = directUsesOf(sources)
  return new Map([...directUses.keys()].map((path) => {
    const reached = reachFrom([...(directUses.get(path) ?? [])], directUses, new Set())
    return [path, new Set([...reached].filter((used) => used !== path))] as const
  }))
}

const blockerCountOf = <File extends OrderedFile>(file: File, pending: readonly File[], mustFollow: MustFollow): number =>
  pending.filter((other) => other !== file && mustFollow(file.path, other.path)).length

const placeInOrder = <File extends OrderedFile>(pending: readonly File[], placed: readonly File[], mustFollow: MustFollow): File[] => {
  if (pending.length === 0) return [...placed]
  const counts = pending.map((file) => blockerCountOf(file, pending, mustFollow))
  const next = pending[counts.indexOf(Math.min(...counts))]
  return placeInOrder(pending.filter((file) => file !== next), [...placed, next], mustFollow)
}

const usesOf = (usedPaths: UsedPaths) => (file: string, other: string): boolean => usedPaths.get(file)?.has(other) ?? false

const isUsedBy = (usedPaths: UsedPaths) => (file: string, other: string): boolean => usedPaths.get(other)?.has(file) ?? false

const IMPORTANCE_RANKS = { both: 0, coreChange: 1, spotlight: 2, neither: 3 } as const

const importanceRankOf = ({ isCoreChange, isInSpotlight }: OrderedFile): number => {
  if (isCoreChange && isInSpotlight) return IMPORTANCE_RANKS.both
  if (isCoreChange) return IMPORTANCE_RANKS.coreChange
  return isInSpotlight ? IMPORTANCE_RANKS.spotlight : IMPORTANCE_RANKS.neither
}

const byImportance = <File extends OrderedFile>(files: readonly File[]): File[] =>
  [...files].sort((one, two) => importanceRankOf(one) - importanceRankOf(two))

export const orderFiles = <File extends OrderedFile>(files: readonly File[], order: WalkthroughOrder, sources: readonly SourceFile[]): File[] => {
  const usedPaths = listUsedPaths(sources)
  if (order === "imports-top-down") return placeInOrder(files, [], isUsedBy(usedPaths))
  const bottomUp = placeInOrder(files, [], usesOf(usedPaths))
  return order === "important-first" ? byImportance(bottomUp) : bottomUp
}
