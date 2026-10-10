import { filesByPathOf, findDefinition, type ASTGraphFile, type Definition, type FilesByPath, type SymbolReference } from "@/ast-graph"
import { firstOfEach } from "@/shared/first-of-each"
import type { CodeReference } from "@flightplan/configurations"

export interface FileCodeReferences {
  readonly path: string
  readonly references: readonly CodeReference[]
}

const KEY_SEPARATOR = ":"

const isShownWithReference = ({ path, lines: [startLine, endLine] }: Definition, file: ASTGraphFile, { range }: SymbolReference): boolean =>
  path === file.filePath && startLine <= range.start.line && range.start.line <= endLine

const toCodeReference = ({ range }: SymbolReference, { path, lines, isLibrary }: Definition): CodeReference => ({
  line: range.start.line,
  startColumn: range.start.column,
  endColumn: range.end.column,
  path,
  lines: [lines[0], lines[1]],
  isLibrary,
})

const codeReferenceKeyOf = ({ line, startColumn }: CodeReference): string => [line, startColumn].join(KEY_SEPARATOR)

const inReadingOrder = (references: readonly CodeReference[]): CodeReference[] =>
  [...references].sort((one, two) => one.line - two.line || one.startColumn - two.startColumn)

const listReferencesOf = (files: FilesByPath, file: ASTGraphFile): CodeReference[] =>
  inReadingOrder(
    firstOfEach(
      file.listReferences().flatMap((reference) => {
        const definition = reference.range.start.line === reference.range.end.line ? findDefinition(files, file, reference) : null
        return definition === null || isShownWithReference(definition, file, reference) ? [] : [toCodeReference(reference, definition)]
      }),
      codeReferenceKeyOf,
    ),
  )

export const generateCodeReferences = (astGraphFiles: readonly ASTGraphFile[], paths: readonly string[]): FileCodeReferences[] => {
  const files = filesByPathOf(astGraphFiles)
  return [...new Set(paths)]
    .sort((one, two) => one.localeCompare(two))
    .flatMap((path) => {
      const file = files.get(path)
      return file === undefined ? [] : [{ path, references: listReferencesOf(files, file) }]
    })
}
