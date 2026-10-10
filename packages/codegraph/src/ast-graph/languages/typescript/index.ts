import { textOfTree } from "@/ast-graph/languages/file-syntax"
import type { GrammarId, SyntaxTree } from "@/ast-graph/parser"
import type { FileSyntax } from "@/ast-graph/types"
import { readFileVariables } from "./declarations"
import { readRootEncapsulations } from "./encapsulations"
import { readExportAliases, readReExports } from "./exports"
import { readImportVariables } from "./imports"
import { readReferences } from "./references"
import { readFileStatements } from "./statements"
import { readSyntaxSites } from "./syntax-sites"

const GRAMMAR: GrammarId = "typescript"

export const readTypescriptSyntax = (tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): FileSyntax => ({
  ...textOfTree(tree),
  rootEncapsulations: readRootEncapsulations(GRAMMAR, tree),
  fileVariables: readFileVariables(GRAMMAR, tree),
  importVariables: readImportVariables(GRAMMAR, tree, importedFilePaths),
  references: readReferences(GRAMMAR, tree),
  exportAliases: readExportAliases(GRAMMAR, tree),
  reExports: readReExports(GRAMMAR, tree, importedFilePaths),
  syntaxSites: readSyntaxSites(GRAMMAR, tree),
  statements: readFileStatements(GRAMMAR, tree),
})
