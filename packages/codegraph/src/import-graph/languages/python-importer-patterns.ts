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

const importLinePattern = (name: string): string =>
  `${INDENT}(from|import)${GAP}(.*${NAME_BOUNDARY})?${escaped(name)}($|${NAME_BOUNDARY})`

const continuedImportPattern = (packagePath: string): string => `${INDENT}from${GAP}${packagePath}${GAP}import${CONTINUED_LINE}`

const namedPackagePath = (name: string): string => `${MODULE_PATH_PREFIX}${escaped(name)}`

const RELATIVE_IMPORT_PATTERN = `${INDENT}from${GAP}${RELATIVE_PACKAGE}${GAP}import`

interface NamedModule {
  readonly name: string | null
  readonly packageName: string | null
}

const namedModuleOf = (filePath: string): NamedModule => {
  const directory = path.posix.dirname(filePath)
  const fileName = path.posix.basename(filePath, path.posix.extname(filePath))
  return fileName === PACKAGE_ENTRY_NAME
    ? { name: folderNameOf(directory), packageName: folderNameOf(path.posix.dirname(directory)) }
    : { name: fileName, packageName: folderNameOf(directory) }
}

export const isPackageEntry = (filePath: string): boolean =>
  path.posix.basename(filePath, path.posix.extname(filePath)) === PACKAGE_ENTRY_NAME

export const importerPatterns = (filePath: string): string[] => {
  const { name, packageName } = namedModuleOf(filePath)
  return [
    ...(name === null ? [] : [importLinePattern(name)]),
    ...(packageName === null ? [] : [continuedImportPattern(namedPackagePath(packageName))]),
    isPackageEntry(filePath) ? RELATIVE_IMPORT_PATTERN : continuedImportPattern(RELATIVE_PACKAGE),
  ]
}
