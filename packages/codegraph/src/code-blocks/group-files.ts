import type { ImportGraphFile } from "@/import-graph"

type FileGroup = readonly ImportGraphFile[]

export type IsLeftOut = (filePath: string) => boolean

const withoutLeftOut = (cluster: FileGroup, isLeftOut: IsLeftOut): ImportGraphFile[] =>
  cluster
    .filter((file) => !isLeftOut(file.filePath))
    .map((file) => ({
      ...file,
      importedBy: file.importedBy.filter((filePath) => !isLeftOut(filePath)),
      importsTo: file.importsTo.filter((filePath) => !isLeftOut(filePath)),
    }))

const addConnected = (groups: readonly FileGroup[], file: ImportGraphFile): readonly FileGroup[] => {
  const joined = new Set([...file.importedBy, ...file.importsTo])
  const isJoined = (group: FileGroup): boolean =>
    group.some((other) => joined.has(other.filePath) || other.importedBy.includes(file.filePath) || other.importsTo.includes(file.filePath))
  return [...groups.filter((group) => !isJoined(group)), [...groups.filter(isJoined).flat(), file]]
}

const hasChange = (group: FileGroup): boolean => group.some((file) => file.diffType !== null)

const byPath = (one: ImportGraphFile, two: ImportGraphFile): number => (one.filePath < two.filePath ? -1 : Number(one.filePath > two.filePath))

export const splitIntoGroups = (cluster: FileGroup, isLeftOut: IsLeftOut): ImportGraphFile[][] =>
  withoutLeftOut(cluster, isLeftOut)
    .reduce(addConnected, [])
    .filter(hasChange)
    .map((group) => [...group].sort(byPath))
    .sort((one, two) => byPath(one[0], two[0]))
