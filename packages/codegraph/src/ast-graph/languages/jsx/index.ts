import { BaseASTGraphFile } from "@/ast-graph/languages/base"
import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readRootEncapsulations } from "@/ast-graph/languages/typescript/encapsulations"
import { readExportAliases, readReExports } from "@/ast-graph/languages/typescript/exports"
import { readImportVariables } from "@/ast-graph/languages/typescript/imports"
import { readFileStatements } from "@/ast-graph/languages/typescript/statements"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { Encapsulation, ExportAlias, FileVariable, ImportVariable, ReExport, Statement, SymbolReference, SyntaxSite } from "@/ast-graph/types"
import { JSX_GRAMMAR, readJsxReferences } from "./references"
import { MARKUP_PATTERN, readJsxSyntaxSites } from "./syntax-sites"

export class JSXASTGraphFile extends BaseASTGraphFile {
  protected extractRootEncapsulations(tree: SyntaxTree): readonly Encapsulation[] {
    return readRootEncapsulations(JSX_GRAMMAR, tree)
  }

  protected extractFileVariables(tree: SyntaxTree): readonly FileVariable[] {
    return readFileVariables(JSX_GRAMMAR, tree)
  }

  protected extractImportVariables(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ImportVariable[] {
    return readImportVariables(JSX_GRAMMAR, tree, importedFilePaths)
  }

  protected extractReferences(tree: SyntaxTree): readonly SymbolReference[] {
    return readJsxReferences(tree)
  }

  protected extractExportAliases(tree: SyntaxTree): readonly ExportAlias[] {
    return readExportAliases(JSX_GRAMMAR, tree)
  }

  protected extractReExports(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ReExport[] {
    return readReExports(JSX_GRAMMAR, tree, importedFilePaths)
  }

  protected extractSyntaxSites(tree: SyntaxTree): readonly SyntaxSite[] {
    return readJsxSyntaxSites(tree)
  }

  protected extractStatements(tree: SyntaxTree): readonly Statement[] {
    return readFileStatements(JSX_GRAMMAR, tree, MARKUP_PATTERN)
  }
}
