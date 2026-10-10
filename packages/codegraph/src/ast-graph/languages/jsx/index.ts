import { textOfTree } from "@/ast-graph/languages/file-syntax"
import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readRootEncapsulations } from "@/ast-graph/languages/typescript/encapsulations"
import { readExportAliases, readReExports } from "@/ast-graph/languages/typescript/exports"
import { readImportVariables } from "@/ast-graph/languages/typescript/imports"
import { readFileStatements } from "@/ast-graph/languages/typescript/statements"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { FileSyntax } from "@/ast-graph/types"
import { JSX_GRAMMAR, readJsxReferences } from "./references"
import { MARKUP_PATTERN, readJsxSyntaxSites } from "./syntax-sites"

export const readJsxSyntax = (tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): FileSyntax => ({
  ...textOfTree(tree),
  rootEncapsulations: readRootEncapsulations(JSX_GRAMMAR, tree),
  fileVariables: readFileVariables(JSX_GRAMMAR, tree),
  importVariables: readImportVariables(JSX_GRAMMAR, tree, importedFilePaths),
  references: readJsxReferences(tree),
  exportAliases: readExportAliases(JSX_GRAMMAR, tree),
  reExports: readReExports(JSX_GRAMMAR, tree, importedFilePaths),
  syntaxSites: readJsxSyntaxSites(tree),
  statements: readFileStatements(JSX_GRAMMAR, tree, MARKUP_PATTERN),
})
