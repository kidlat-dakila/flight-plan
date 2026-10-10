import type { ImportGraphFile } from "@/import-graph"
import { isIgnoredFile } from "./ignored-files"

type FileGroup = readonly ImportGraphFile[]

const withoutIgnored = (cluster: FileGroup): ImportGraphFile[] =>
  cluster
    .filter((file) => !isIgnoredFile(file.filePath))
    .map((file) => ({
      ...file,
      importedBy: file.importedBy.filter((filePath) => !isIgnoredFile(filePath)),
      importsTo: file.importsTo.filter((filePath) => !isIgnoredFile(filePath)),
    }))

const addConnected = (groups: readonly FileGroup[], file: ImportGraphFile): readonly FileGroup[] => {
  const joined = new Set([...file.importedBy, ...file.importsTo])
  const isJoined = (group: FileGroup): boolean =>
    group.some((other) => joined.has(other.filePath) || other.importedBy.includes(file.filePath) || other.importsTo.includes(file.filePath))
  return [...groups.filter((group) => !isJoined(group)), [...groups.filter(isJoined).flat(), file]]
}

const hasChange = (group: FileGroup): boolean => group.some((file) => file.diffType !== null)

const byPath = (one: ImportGraphFile, two: ImportGraphFile): number => (one.filePath < two.filePath ? -1 : Number(one.filePath > two.filePath))

export const splitIntoGroups = (cluster: FileGroup): ImportGraphFile[][] =>
  withoutIgnored(cluster)
    .reduce(addConnected, [])
    .filter(hasChange)
    .map((group) => [...group].sort(byPath))
    .sort((one, two) => byPath(one[0], two[0]))
