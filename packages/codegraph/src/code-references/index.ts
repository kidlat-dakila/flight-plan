import { filesByPathOf, findDefinition, type ASTGraphFile, type Definition, type FilesByPath, type SymbolReference } from "@/ast-graph"
import { firstOfEach } from "@/shared/first-of-each"
import type { CodeReference, LanguageReference } from "@flightplan/configurations"

export interface FileCodeReferences {
  readonly path: string
  readonly references: readonly CodeReference[]
  readonly languageReferences: readonly LanguageReference[]
}

type Placed = Pick<CodeReference, "line" | "startColumn">

const KEY_SEPARATOR = ":"

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

const inReadingOrder = <Reference extends Placed>(references: readonly Reference[]): Reference[] =>
  [...references].sort((one, two) => one.line - two.line || one.startColumn - two.startColumn)

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

export const generateCodeReferences = (astGraphFiles: readonly ASTGraphFile[], paths: readonly string[]): FileCodeReferences[] => {
  const files = filesByPathOf(astGraphFiles)
  return [...new Set(paths)]
    .sort((one, two) => one.localeCompare(two))
    .flatMap((path) => {
      const file = files.get(path)
      return file === undefined ? [] : [{ path, references: listReferencesOf(files, file), languageReferences: listLanguageReferencesOf(file) }]
    })
}
