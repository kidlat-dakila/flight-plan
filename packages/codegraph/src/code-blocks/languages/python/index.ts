import { readPythonSyntax } from "@/ast-graph/languages/python"
import { parseWithGrammar, type GrammarId } from "@/ast-graph/parser"
import { matchSyntax } from "@/catalogue/matching/match-source"
import { pythonReadingOf, type FindImportedBinding, type PythonReading } from "@/catalogue/matching/python-reader"
import type { FindExportedBinding } from "@/catalogue/matching/syntax-reader"
import { listLibraryUses } from "@/code-blocks/classifications"
import { withReturns } from "@/code-blocks/languages/returns"
import { createFileNaming } from "@/code-blocks/languages/typescript/named-by"
import { nodeAtRange } from "@/code-blocks/languages/typescript/syntax"
import { LIBRARIES } from "@/code-blocks/libraries"
import { listOwnUses, nodeFinderOf, withCards } from "@/code-blocks/libraries/cards"
import type { FileExports, OutlinedFile } from "@/code-blocks/reading"
import { fromSyntaxRange, toSyntaxRange } from "@/code-blocks/source-range"
import { Memo } from "@/shared/memo"
import { readPythonBlocks } from "./blocks"
import { isModuleWide, isModuleWideImport, readPythonOutline, resolutionAt, type PythonOutline } from "./outline"
import { readPythonUses } from "./uses"

export interface PythonSource {
  readonly filePath: string
  readonly source: string
  readonly importedFilePaths: ReadonlyMap<string, string>
}

const GRAMMAR: GrammarId = "python"
const FUNCTION_TYPE = "function"
const FUNCTION_TYPES: ReadonlySet<string> = new Set(["function_definition", "lambda"])

const exportsOf = (outline: PythonOutline): FileExports => ({
  local: outline.declarations
    .filter((declaration) => isModuleWide(outline, declaration))
    .map(({ name, range, type }) => ({ exportedName: name, declarationRange: fromSyntaxRange(range), isFunction: type === FUNCTION_TYPE })),
  forwarded: outline.imports
    .filter((variable) => isModuleWideImport(outline, variable))
    .map(({ name, importedName, importedFilePath }) => ({ exportedName: name, importedName, filePath: importedFilePath })),
})

const findImportedIn = (outline: PythonOutline, findBinding: FindExportedBinding): FindImportedBinding => (name) => {
  const resolution = resolutionAt(outline, name)
  if (resolution?.kind !== "import" || resolution.variable.importedFilePath === null) return null
  return findBinding(resolution.variable.importedFilePath, resolution.variable.importedName)
}

const pythonReadingIn = (outline: PythonOutline, findBinding: FindExportedBinding): PythonReading => pythonReadingOf(outline.tree, findImportedIn(outline, findBinding))

export const outlinePython = ({ filePath, source, importedFilePaths }: PythonSource): OutlinedFile => {
  const outline = readPythonOutline(parseWithGrammar(GRAMMAR, source), importedFilePaths)
  const readings = new Memo<FindExportedBinding, PythonReading>()
  const readingFor = (findBinding: FindExportedBinding): PythonReading => readings.remember(findBinding, () => pythonReadingIn(outline, findBinding))
  return {
    filePath,
    exports: exportsOf(outline),
    bindingAt: (declarationRange, findBinding) =>
      readingFor(findBinding).declaredBindingAt(nodeAtRange(outline.tree, toSyntaxRange(declarationRange))),
    read: (findExport, findBinding) => {
      const matches = matchSyntax(readingFor(findBinding).reader, LIBRARIES)
      const blocks = withReturns(readPythonBlocks({ filePath, outline, naming: createFileNaming(matches), findExport }), outline.tree.rootNode, FUNCTION_TYPES)
      return {
        filePath,
        blocks: withCards(blocks, matches, outline.tree, LIBRARIES),
        uses: readPythonUses(outline),
        libraryUses: [...listLibraryUses(matches, LIBRARIES), ...listOwnUses(blocks, matches, outline.tree, LIBRARIES)],
        readSyntax: () => readPythonSyntax(outline.tree, importedFilePaths),
        nodeAt: nodeFinderOf(outline.tree),
      }
    },
  }
}
