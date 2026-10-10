import { textOfTree } from "@/ast-graph/languages/file-syntax"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { FileSyntax } from "@/ast-graph/types"
import { readFileVariables } from "./declarations"
import { readRootEncapsulations } from "./encapsulations"
import { readImportVariables } from "./imports"
import { readReferences } from "./references"
import { readFileStatements } from "./statements"

export const readPythonSyntax = (tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): FileSyntax => {
  const importVariables = readImportVariables(tree, importedFilePaths)
  return {
    ...textOfTree(tree),
    rootEncapsulations: readRootEncapsulations(tree),
    fileVariables: readFileVariables(tree),
    importVariables,
    references: readReferences(tree),
    exportAliases: importVariables.map(({ name }) => ({ name, exportedName: name })),
    reExports: [],
    syntaxSites: [],
    statements: readFileStatements(tree),
  }
}
