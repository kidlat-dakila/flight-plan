import { BaseASTGraphFile } from "@/ast-graph/languages/base"
import type { GrammarId, SyntaxTree } from "@/ast-graph/parser"
import type { Encapsulation, FileVariable, ImportVariable, SymbolReference } from "@/ast-graph/types"
import { readFileVariables } from "./declarations"
import { readRootEncapsulations } from "./encapsulations"
import { readImportVariables } from "./imports"
import { readReferences } from "./references"

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
}
