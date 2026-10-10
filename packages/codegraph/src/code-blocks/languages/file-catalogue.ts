import { fitsGlob } from "@/catalogue/matching/file-patterns"
import type { CatalogueLibrary, FilePattern, LibraryLanguage, SlotRuns } from "@/catalogue/types"
import type { FileManifest } from "@/code-blocks/manifests"
import type { FileExports, FileReading, ReadBlock } from "@/code-blocks/reading"
import { positionKey } from "@/code-blocks/source-range"
import type { CodeBlockCatalogue } from "@/code-blocks/types"
import { LIBRARIES, registryNamesOf } from "@/data/libraries"

export interface ExportNaming {
  readonly exportedName: string
  readonly catalogue: CodeBlockCatalogue
}

const FOLDER_SEPARATOR = "/"
const SCOPE_MARK = "@"
const SCOPED_NAME_LENGTH = 2
const ANY_FOLDERS = "/**/"
const CHOICE_PATTERN = /^\{(?<choices>[^{}]*)\}$/
const CHOICE_SEPARATOR = ","
const WILDCARD_PATTERN = /[*?[]/
const EXTENSION_MARK = "."
const INDEX_NAME = "index"
const ROUTE_GROUP_PATTERN = /^\(.*\)$/
const PATHED_RUNS: ReadonlySet<SlotRuns> = new Set<SlotRuns>(["page", "route"])
const WORD_BREAK_PATTERN = /[-.]/g

const packageNameOf = (specifier: string): string => {
  const parts = specifier.split(FOLDER_SEPARATOR)
  return specifier.startsWith(SCOPE_MARK) ? parts.slice(0, SCOPED_NAME_LENGTH).join(FOLDER_SEPARATOR) : parts[0]
}

const moduleNameOf = (name: string): string => name.toLowerCase().replace(WORD_BREAK_PATTERN, "_")

const listRegistryNames = ({ specifiers, language }: CatalogueLibrary): string[] =>
  LIBRARIES
    .filter((listed) => listed.language === language && listed.specifiers.some((specifier) => specifiers.includes(specifier)))
    .flatMap(registryNamesOf)

const isUsed = (library: CatalogueLibrary, { packages }: FileManifest): boolean => {
  const { specifiers, language } = library
  if (specifiers.length === 0) return true
  const installedAs = [...specifiers.map(packageNameOf), ...listRegistryNames(library)]
  if (language !== "python") return installedAs.some((name) => packages.includes(name))
  const used = packages.map(moduleNameOf)
  return installedAs.some((name) => used.includes(moduleNameOf(name)))
}

const isFilePattern = (pattern: CatalogueLibrary["patterns"][number]): pattern is FilePattern => pattern.kind === "file"

const rootsOf = (glob: string): string[] => {
  const root = glob.slice(0, glob.indexOf(ANY_FOLDERS))
  const choices = CHOICE_PATTERN.exec(root)?.groups?.choices
  return choices === undefined ? [root] : choices.split(CHOICE_SEPARATOR)
}

const nameWithoutExtension = (fileName: string): string => (fileName.includes(EXTENSION_MARK) ? fileName.slice(0, fileName.indexOf(EXTENSION_MARK)) : fileName)

const namesItsFile = (glob: string): boolean => !WILDCARD_PATTERN.test(nameWithoutExtension(glob.slice(glob.lastIndexOf(FOLDER_SEPARATOR) + 1)))

export const routePathOf = (glob: string, packagePath: string): string | null => {
  if (!glob.includes(ANY_FOLDERS)) return null
  const root = rootsOf(glob).find((candidate) => packagePath.startsWith(`${candidate}${FOLDER_SEPARATOR}`))
  if (root === undefined) return null
  const parts = packagePath.slice(root.length + FOLDER_SEPARATOR.length).split(FOLDER_SEPARATOR)
  const fileName = nameWithoutExtension(parts[parts.length - 1])
  const named = namesItsFile(glob) || fileName === INDEX_NAME ? [] : [fileName]
  const segments = [...parts.slice(0, -1), ...named].filter((segment) => !ROUTE_GROUP_PATTERN.test(segment))
  return `${FOLDER_SEPARATOR}${segments.join(FOLDER_SEPARATOR)}`
}

const namingsOfPattern = (library: CatalogueLibrary, pattern: FilePattern, { packagePath }: FileManifest): ExportNaming[] =>
  pattern.exports.map(({ name, runs, method }) => ({
    exportedName: name,
    catalogue: {
      specifier: library.specifiers.length === 0 ? null : library.specifiers[0],
      name: pattern.glob,
      runs,
      path: PATHED_RUNS.has(runs) ? routePathOf(pattern.glob, packagePath) : null,
      method: method ?? null,
      event: null,
      certainty: pattern.versions === undefined ? "proven" : "assumed",
    },
  }))

export const listExportNamings = (manifest: FileManifest | undefined, language: LibraryLanguage, libraries: readonly CatalogueLibrary[]): ExportNaming[] => {
  if (manifest === undefined) return []
  return libraries
    .filter((library) => library.language === language && isUsed(library, manifest))
    .flatMap((library) =>
      library.patterns
        .filter(isFilePattern)
        .filter((pattern) => fitsGlob(pattern.glob, manifest.packagePath))
        .flatMap((pattern) => namingsOfPattern(library, pattern, manifest)))
}

const withNaming = (block: ReadBlock, catalogueByStart: ReadonlyMap<string, CodeBlockCatalogue>): ReadBlock => {
  const said = block.declaredAt.map((declaredAt) => catalogueByStart.get(positionKey(declaredAt))).find((catalogue) => catalogue !== undefined)
  return said === undefined || block.catalogue !== undefined ? block : { ...block, catalogue: said }
}

export const withExportNamings = (reading: FileReading, exports: FileExports, namings: readonly ExportNaming[]): FileReading => {
  if (namings.length === 0) return reading
  const catalogueByStart = new Map(
    [...namings].reverse().flatMap(({ exportedName, catalogue }) =>
      exports.local.filter((exported) => exported.exportedName === exportedName).map((exported) => [positionKey(exported.declarationRange.start), catalogue] as const)),
  )
  return { ...reading, blocks: reading.blocks.map((block) => withNaming(block, catalogueByStart)) }
}
