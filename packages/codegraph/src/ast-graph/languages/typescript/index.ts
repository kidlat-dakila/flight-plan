import { BaseASTGraphFile } from "@/ast-graph/languages/base"
import type { GrammarId, SyntaxTree } from "@/ast-graph/parser"
import type { Encapsulation, ExportAlias, FileVariable, ImportVariable, ReExport, Statement, SymbolReference, SyntaxSite } from "@/ast-graph/types"
import { readFileVariables } from "./declarations"
import { readRootEncapsulations } from "./encapsulations"
import { readExportAliases, readReExports } from "./exports"
import { readImportVariables } from "./imports"
import { readReferences } from "./references"
import { readFileStatements } from "./statements"
import { readSyntaxSites } from "./syntax-sites"

const GRAMMAR: GrammarId = "typescript"

export class TypescriptASTGraphFile extends BaseASTGraphFile {
  protected extractRootEncapsulations(tree: SyntaxTree): readonly Encapsulation[] {
    return readRootEncapsulations(GRAMMAR, tree)
  }

  protected extractFileVariables(tree: SyntaxTree): readonly FileVariable[] {
    return readFileVariables(GRAMMAR, tree)
  }

  protected extractImportVariables(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ImportVariable[] {
    return readImportVariables(GRAMMAR, tree, importedFilePaths)
  }

  protected extractReferences(tree: SyntaxTree): readonly SymbolReference[] {
    return readReferences(GRAMMAR, tree)
  }

  protected extractExportAliases(tree: SyntaxTree): readonly ExportAlias[] {
    return readExportAliases(GRAMMAR, tree)
  }

  protected extractReExports(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ReExport[] {
    return readReExports(GRAMMAR, tree, importedFilePaths)
  }

  protected extractSyntaxSites(tree: SyntaxTree): readonly SyntaxSite[] {
    return readSyntaxSites(GRAMMAR, tree)
  }

  protected extractStatements(tree: SyntaxTree): readonly Statement[] {
    return readFileStatements(GRAMMAR, tree)
  }
}
