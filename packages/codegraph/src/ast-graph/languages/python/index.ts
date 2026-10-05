import { BaseASTGraphFile } from "@/ast-graph/languages/base"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { Encapsulation, FileVariable, ImportVariable, SymbolReference } from "@/ast-graph/types"
import { readFileVariables } from "./declarations"
import { readRootEncapsulations } from "./encapsulations"
import { readImportVariables } from "./imports"
import { readReferences } from "./references"

export class PythonASTGraphFile extends BaseASTGraphFile {
  protected extractRootEncapsulations(tree: SyntaxTree): readonly Encapsulation[] {
    return readRootEncapsulations(tree)
  }

  protected extractFileVariables(tree: SyntaxTree): readonly FileVariable[] {
    return readFileVariables(tree)
  }

  protected extractImportVariables(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ImportVariable[] {
    return readImportVariables(tree, importedFilePaths)
  }

  protected extractReferences(tree: SyntaxTree): readonly SymbolReference[] {
    return readReferences(tree)
  }
}
