import * as path from "node:path"

export interface PathAlias {
  readonly name: string
  readonly targets: readonly string[]
}

export interface ImportedFile {
  readonly filePath: string
  readonly packageDirectory: string | null
  readonly packageName: string | null
  readonly pathAliases: readonly PathAlias[]
}

const QUOTE = "[\"'`]"
const QUOTE_OR_SLASH = "[\"'`/]"
const WRITTEN_EXTENSION = "(\\.[A-Za-z.]+)?"
const TRAILING_SLASH = "/?"
const FOLDER_SPECIFIER_PATTERN = `${QUOTE_OR_SLASH}\\.\\.?${TRAILING_SLASH}${QUOTE}`
const REGULAR_EXPRESSION_SYMBOLS = /[.*+?^${}()|[\]\\]/g
const DECLARATION_SUFFIX = ".d"
const INDEX_NAME = "index"
const ROOT_DIRECTORY = "."

const escaped = (text: string): string => text.replaceAll(REGULAR_EXPRESSION_SYMBOLS, String.raw`\$&`)

export const moduleNameOf = (filePath: string): string => {
  const name = path.posix.basename(filePath, path.posix.extname(filePath))
  return name.endsWith(DECLARATION_SUFFIX) ? name.slice(0, -DECLARATION_SUFFIX.length) : name
}

const folderNameOf = (directory: string): string | null =>
  directory === ROOT_DIRECTORY || directory === "" ? null : path.posix.basename(directory)

const anyOf = (texts: readonly string[]): string => `(${texts.map(escaped).join("|")})`

const distinct = (texts: readonly (string | null)[]): string[] => [
  ...new Set(texts.filter((text): text is string => text !== null)),
]

const isFolderEntry = ({ filePath }: ImportedFile): boolean => moduleNameOf(filePath) === INDEX_NAME

const targetNamesOf = (file: ImportedFile): (string | null)[] => [
  moduleNameOf(file.filePath),
  isFolderEntry(file) ? folderNameOf(path.posix.dirname(file.filePath)) : null,
]

const writtenNamesOf = (file: ImportedFile): (string | null)[] => [
  ...targetNamesOf(file),
  file.packageDirectory === null ? null : folderNameOf(file.packageDirectory),
]

const aliasNamesOf = (file: ImportedFile): string[] => {
  const targetNames = targetNamesOf(file)
  return file.pathAliases
    .filter((alias) => alias.targets.some((target) => targetNames.includes(moduleNameOf(target))))
    .map((alias) => alias.name)
}

const patternFor = (texts: readonly string[], patternOf: (alternatives: string) => string): string[] =>
  texts.length === 0 ? [] : [patternOf(anyOf(texts))]

export const importerPatterns = (files: readonly ImportedFile[]): string[] => [
  ...patternFor(
    distinct(files.flatMap(writtenNamesOf)),
    (names) => `${QUOTE_OR_SLASH}${names}${WRITTEN_EXTENSION}${TRAILING_SLASH}${QUOTE}`,
  ),
  ...(files.some(isFolderEntry) ? [FOLDER_SPECIFIER_PATTERN] : []),
  ...patternFor(distinct(files.map((file) => file.packageName)), (names) => `${QUOTE}${names}${QUOTE_OR_SLASH}`),
  ...patternFor(distinct(files.flatMap(aliasNamesOf)), (names) => `${QUOTE}${names}${QUOTE}`),
]
