import * as path from "node:path"

const PACKAGE_ENTRY_NAME = "__init__"
const ROOT_DIRECTORY = "."
const INDENT = "^[ \t]*"
const GAP = "[ \t]+"
const NAME_BOUNDARY = "[^A-Za-z0-9_]"
const MODULE_PATH_PREFIX = "([.A-Za-z0-9_]*[.])?"
const CONTINUED_LINE = "[ \t]*[(\\\\]"
const RELATIVE_PACKAGE = "\\.+"
const REGULAR_EXPRESSION_SYMBOLS = /[.*+?^${}()|[\]\\]/g

const escaped = (text: string): string => text.replaceAll(REGULAR_EXPRESSION_SYMBOLS, String.raw`\$&`)

const folderNameOf = (directory: string): string | null =>
  directory === ROOT_DIRECTORY || directory === "" ? null : path.posix.basename(directory)

const anyOf = (texts: readonly string[]): string => `(${texts.map(escaped).join("|")})`

const distinct = (texts: readonly (string | null)[]): string[] => [
  ...new Set(texts.filter((text): text is string => text !== null)),
]

const importLinePattern = (names: string): string => `${INDENT}(from|import)${GAP}(.*${NAME_BOUNDARY})?${names}($|${NAME_BOUNDARY})`

const continuedImportPattern = (packagePath: string): string => `${INDENT}from${GAP}${packagePath}${GAP}import${CONTINUED_LINE}`

const RELATIVE_IMPORT_PATTERN = `${INDENT}from${GAP}${RELATIVE_PACKAGE}${GAP}import`

interface NamedModule {
  readonly name: string | null
  readonly packageName: string | null
}

export const isPackageEntry = (filePath: string): boolean =>
  path.posix.basename(filePath, path.posix.extname(filePath)) === PACKAGE_ENTRY_NAME

const namedModuleOf = (filePath: string): NamedModule => {
  const directory = path.posix.dirname(filePath)
  return isPackageEntry(filePath)
    ? { name: folderNameOf(directory), packageName: folderNameOf(path.posix.dirname(directory)) }
    : { name: path.posix.basename(filePath, path.posix.extname(filePath)), packageName: folderNameOf(directory) }
}

const patternFor = (texts: readonly string[], patternOf: (alternatives: string) => string): string[] =>
  texts.length === 0 ? [] : [patternOf(anyOf(texts))]

const relativeImportPattern = (filePaths: readonly string[]): string[] => {
  if (filePaths.length === 0) return []
  return [filePaths.some(isPackageEntry) ? RELATIVE_IMPORT_PATTERN : continuedImportPattern(RELATIVE_PACKAGE)]
}

export const importerPatterns = (filePaths: readonly string[]): string[] => {
  const modules = filePaths.map(namedModuleOf)
  return [
    ...patternFor(distinct(modules.map((module) => module.name)), importLinePattern),
    ...patternFor(distinct(modules.map((module) => module.packageName)), (names) =>
      continuedImportPattern(`${MODULE_PATH_PREFIX}${names}`),
    ),
    ...relativeImportPattern(filePaths),
  ]
}
