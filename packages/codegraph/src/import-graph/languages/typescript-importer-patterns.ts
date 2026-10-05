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

const namePattern = (name: string): string =>
  `${QUOTE_OR_SLASH}${escaped(name)}${WRITTEN_EXTENSION}${TRAILING_SLASH}${QUOTE}`

const packagePattern = (packageName: string): string => `${QUOTE}${escaped(packageName)}${QUOTE_OR_SLASH}`

const aliasPattern = (alias: PathAlias): string => `${QUOTE}${escaped(alias.name)}${QUOTE}`

const present = (names: readonly (string | null)[]): string[] => names.filter((name): name is string => name !== null)

export const importerPatterns = ({ filePath, packageDirectory, packageName, pathAliases }: ImportedFile): string[] => {
  const moduleName = moduleNameOf(filePath)
  const isFolderEntry = moduleName === INDEX_NAME
  const folderName = isFolderEntry ? folderNameOf(path.posix.dirname(filePath)) : null
  const packageFolderName = packageDirectory === null ? null : folderNameOf(packageDirectory)
  const writtenNames = [...new Set(present([moduleName, folderName, packageFolderName]))]
  const targetNames = present([moduleName, folderName])
  const aliases = pathAliases.filter((alias) => alias.targets.some((target) => targetNames.includes(moduleNameOf(target))))
  return [
    ...writtenNames.map(namePattern),
    ...(isFolderEntry ? [FOLDER_SPECIFIER_PATTERN] : []),
    ...(packageName === null ? [] : [packagePattern(packageName)]),
    ...aliases.map(aliasPattern),
  ]
}
