import { isAbsolute, relative, sep } from "node:path"
import type { Fzf as FzfClass, Tiebreaker } from "fzf"

const PARENT_SEGMENT = ".."

const pathBelowRoot = (path: string, rootPath: string): string => {
  const relativePath = relative(rootPath, path)
  const isOutsideRoot = relativePath.startsWith(PARENT_SEGMENT) || isAbsolute(relativePath)
  return isOutsideRoot ? path : relativePath
}

const matchedLettersInFolderName = (folderPath: string, matchedPositions: ReadonlySet<number>): number => {
  const folderNameStart = folderPath.lastIndexOf(sep) + 1
  return [...matchedPositions].filter((position) => position >= folderNameStart).length
}

const byMostLettersInFolderName: Tiebreaker<string> = (first, second, selector) =>
  matchedLettersInFolderName(selector(second.item), second.positions)
  - matchedLettersInFolderName(selector(first.item), first.positions)

interface FzfModule {
  readonly Fzf: typeof FzfClass
}

const loadFzf = async (): Promise<FzfModule> => await import("fzf")

export const rankRepositoryFolders = async (
  paths: readonly string[],
  query: string,
  rootPath: string,
): Promise<readonly string[]> => {
  const { Fzf } = await loadFzf()
  return new Fzf(paths, {
    selector: (path) => pathBelowRoot(path, rootPath),
    casing: "case-insensitive",
    forward: false,
    tiebreakers: [byMostLettersInFolderName],
  })
    .find(query.trim())
    .map((match) => match.item)
}
