import { filesByPathOf, findDefinition, type ASTGraphFile, type Definition, type FilesByPath, type LineRange, type SymbolReference } from "@/ast-graph"
import { firstOfEach } from "@/shared/first-of-each"
import { once } from "@/shared/memo"
import type { CodeExport, CodeReference, CodeUsage, LanguageReference } from "@flightplan/configurations"

export interface FileCodeReferences {
  readonly path: string
  readonly references: readonly CodeReference[]
  readonly languageReferences: readonly LanguageReference[]
  readonly exports: readonly CodeExport[]
}

export type ExportedNamesByPath = ReadonlyMap<string, readonly string[]>

type Placed = Pick<CodeReference, "line" | "startColumn">

interface PlacedUsage {
  readonly definition: Definition
  readonly usage: CodeUsage
}

const KEY_SEPARATOR = ":"
const NO_EXPORTED_NAMES: readonly string[] = []

const isShownWithReference = ({ path, lines: [startLine, endLine] }: Definition, file: ASTGraphFile, { range }: SymbolReference): boolean =>
  path === file.filePath && startLine <= range.start.line && range.start.line <= endLine

const toCodeReference = ({ range }: SymbolReference, { path, lines, isLibrary, library }: Definition): CodeReference => ({
  line: range.start.line,
  startColumn: range.start.column,
  endColumn: range.end.column,
  path,
  lines: [lines[0], lines[1]],
  isLibrary,
  ...(library === null ? {} : { library }),
})

const toLanguageReference = ({ name, range }: SymbolReference): LanguageReference => ({
  line: range.start.line,
  startColumn: range.start.column,
  endColumn: range.end.column,
  name,
})

const placeKeyOf = ({ line, startColumn }: Placed): string => [line, startColumn].join(KEY_SEPARATOR)

const usageKeyOf = (usage: CodeUsage): string => [usage.path, placeKeyOf(usage)].join(KEY_SEPARATOR)

const inReadingOrder = <Reference extends Placed>(references: readonly Reference[]): Reference[] =>
  [...references].sort((one, two) => one.line - two.line || one.startColumn - two.startColumn)

const inFileOrder = (usages: readonly CodeUsage[]): CodeUsage[] =>
  [...usages].sort((one, two) => one.path.localeCompare(two.path) || one.line - two.line || one.startColumn - two.startColumn)

const isOnOneLine = ({ range }: SymbolReference): boolean => range.start.line === range.end.line

const listReferencesOf = (files: FilesByPath, file: ASTGraphFile): CodeReference[] =>
  inReadingOrder(
    firstOfEach(
      file.listReferences().flatMap((reference) => {
        const definition = isOnOneLine(reference) ? findDefinition(files, file, reference) : null
        return definition === null || isShownWithReference(definition, file, reference) ? [] : [toCodeReference(reference, definition)]
      }),
      placeKeyOf,
    ),
  )

const isDeclaredNowhere = (file: ASTGraphFile, reference: SymbolReference): boolean => file.findDeclarationRange(reference) === null

const listLanguageReferencesOf = (file: ASTGraphFile): LanguageReference[] =>
  inReadingOrder(
    firstOfEach(
      file.listReferences().filter((reference) => isOnOneLine(reference) && isDeclaredNowhere(file, reference)).map(toLanguageReference),
      placeKeyOf,
    ),
  )

const listImportedNamesOf = (file: ASTGraphFile): ReadonlySet<string> =>
  new Set(file.listImportVariables().filter((imported) => imported.importedFilePath !== null).map((imported) => imported.name))

const toCodeUsage = (file: ASTGraphFile, { range }: SymbolReference): CodeUsage => ({
  line: range.start.line,
  startColumn: range.start.column,
  endColumn: range.end.column,
  path: file.filePath,
  text: file.readLine(range.start.line),
})

const listImportedUsagesOf = (files: FilesByPath, file: ASTGraphFile): PlacedUsage[] => {
  const importedNames = listImportedNamesOf(file)
  return file.listReferences()
    .filter((reference) => importedNames.has(reference.name) && isOnOneLine(reference))
    .flatMap((reference) => {
      const definition = findDefinition(files, file, reference)
      return definition === null || definition.isLibrary || definition.path === file.filePath ? [] : [{ definition, usage: toCodeUsage(file, reference) }]
    })
}

const isDefinedAt = ({ path, lines: [startLine, endLine] }: Definition, filePath: string, [exportStart, exportEnd]: LineRange): boolean =>
  path === filePath && startLine === exportStart && endLine === exportEnd

const listUsagesOf = (usages: readonly PlacedUsage[], filePath: string, lines: LineRange): CodeUsage[] =>
  inFileOrder(firstOfEach(usages.filter(({ definition }) => isDefinedAt(definition, filePath, lines)).map(({ usage }) => usage), usageKeyOf))

const toCodeExport = (file: ASTGraphFile, exportedName: string, usages: readonly PlacedUsage[]): CodeExport[] => {
  const declaration = file.findExportedDeclaration(exportedName)
  const lines = file.findExportedLines(exportedName)
  if (declaration === null || lines === null || declaration.range.start.line !== declaration.range.end.line) return []
  return [{
    line: declaration.range.start.line,
    startColumn: declaration.range.start.column,
    endColumn: declaration.range.end.column,
    lines: [lines[0], lines[1]],
    usages: listUsagesOf(usages, file.filePath, lines),
  }]
}

const listExportsOf = (file: ASTGraphFile, exportedNames: readonly string[], usages: () => readonly PlacedUsage[]): CodeExport[] =>
  exportedNames.length === 0
    ? []
    : inReadingOrder(firstOfEach(exportedNames.flatMap((exportedName) => toCodeExport(file, exportedName, usages())), placeKeyOf))

export const generateCodeReferences = (
  astGraphFiles: readonly ASTGraphFile[],
  paths: readonly string[],
  exportedNamesByPath: ExportedNamesByPath,
): FileCodeReferences[] => {
  const files = filesByPathOf(astGraphFiles)
  const importedUsages = once(() => astGraphFiles.flatMap((file) => listImportedUsagesOf(files, file)))
  return [...new Set(paths)]
    .sort((one, two) => one.localeCompare(two))
    .flatMap((path) => {
      const file = files.get(path)
      return file === undefined
        ? []
        : [{
            path,
            references: listReferencesOf(files, file),
            languageReferences: listLanguageReferencesOf(file),
            exports: listExportsOf(file, exportedNamesByPath.get(path) ?? NO_EXPORTED_NAMES, importedUsages),
          }]
    })
}
