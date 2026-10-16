import { readPythonSyntax } from "@/ast-graph/languages/python"
import { parseWithGrammar, type GrammarId } from "@/ast-graph/parser"
import { BUILT_IN_LIBRARIES } from "@/catalogue/libraries"
import { matchSyntax } from "@/catalogue/matching/match-source"
import { readPython } from "@/catalogue/matching/python-reader"
import { createFileNaming } from "@/code-blocks/languages/typescript/named-by"
import type { FileExports, OutlinedFile } from "@/code-blocks/reading"
import { fromSyntaxRange } from "@/code-blocks/source-range"
import { readPythonBlocks } from "./blocks"
import { isModuleWide, isModuleWideImport, readPythonOutline, type PythonOutline } from "./outline"
import { readPythonUses } from "./uses"

export interface PythonSource {
  readonly filePath: string
  readonly source: string
  readonly importedFilePaths: ReadonlyMap<string, string>
}

const GRAMMAR: GrammarId = "python"
const FUNCTION_TYPE = "function"

const exportsOf = (outline: PythonOutline): FileExports => ({
  local: outline.declarations
    .filter((declaration) => isModuleWide(outline, declaration))
    .map(({ name, range, type }) => ({ exportedName: name, declarationRange: fromSyntaxRange(range), isFunction: type === FUNCTION_TYPE })),
  forwarded: outline.imports
    .filter((variable) => isModuleWideImport(outline, variable))
    .map(({ name, importedName, importedFilePath }) => ({ exportedName: name, importedName, filePath: importedFilePath })),
})

export const outlinePython = ({ filePath, source, importedFilePaths }: PythonSource): OutlinedFile => {
  const outline = readPythonOutline(parseWithGrammar(GRAMMAR, source), importedFilePaths)
  return {
    filePath,
    exports: exportsOf(outline),
    read: (findExport) => ({
      filePath,
      blocks: readPythonBlocks({ filePath, outline, naming: createFileNaming(matchSyntax(readPython(source), BUILT_IN_LIBRARIES)), findExport }),
      uses: readPythonUses(outline),
      readSyntax: () => readPythonSyntax(outline.tree, importedFilePaths),
    }),
  }
}
