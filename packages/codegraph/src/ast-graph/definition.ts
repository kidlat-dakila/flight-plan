import { NAMESPACE_IMPORT, type BaseASTGraphFile } from "./languages/base"
import { isSameRange } from "./source-range"
import type { ImportedSymbol, ImportVariable, LineRange, SourceRange, SymbolTarget } from "./types"

export interface Definition {
  readonly path: string
  readonly lines: LineRange
  readonly name: SourceRange | null
  readonly isLibrary: boolean
}

export type FilesByPath = ReadonlyMap<string, BaseASTGraphFile>

const DEEPEST_RE_EXPORT_CHAIN = 6

export const filesByPathOf = (files: readonly BaseASTGraphFile[]): FilesByPath => new Map(files.map((file) => [file.filePath, file]))

const findExported = (files: FilesByPath, { filePath, name }: ImportedSymbol, chainLeft: number): Definition | null => {
  const file = files.get(filePath)
  if (file === undefined || chainLeft === 0) return null
  const lines = file.findExportedLines(name)
  if (lines !== null) return { path: filePath, lines, name: null, isLibrary: false }
  return file
    .listReExportedSymbols(name)
    .reduce<Definition | null>((found, forwarded) => found ?? findExported(files, forwarded, chainLeft - 1), null)
}

const importStatementOf = (file: BaseASTGraphFile, imported: ImportVariable): Definition | null => {
  const lines = file.findDeclarationLines(imported)
  return lines === null ? null : { path: file.filePath, lines, name: imported.range, isLibrary: imported.importedFilePath === null }
}

const findImported = (files: FilesByPath, file: BaseASTGraphFile, imported: ImportVariable): Definition | null => {
  const { importedFilePath, importedName } = imported
  const exported = importedFilePath === null || importedName === NAMESPACE_IMPORT
    ? null
    : findExported(files, { filePath: importedFilePath, name: importedName }, DEEPEST_RE_EXPORT_CHAIN)
  return exported ?? importStatementOf(file, imported)
}

const findDeclared = (file: BaseASTGraphFile, target: SymbolTarget): Definition | null => {
  const lines = file.findDeclarationLines(target)
  const name = file.findDeclarationRange(target)
  if (lines === null || name === null || isSameRange(name, target.range)) return null
  return { path: file.filePath, lines, name, isLibrary: false }
}

export const findDefinition = (files: FilesByPath, file: BaseASTGraphFile, target: SymbolTarget): Definition | null => {
  const imported = file.findImportVariable(target)
  if (imported === null) return findDeclared(file, target)
  return isSameRange(imported.range, target.range) ? null : findImported(files, file, imported)
}
