import { BaseASTGraphFile } from "@/ast-graph/languages/base"
import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readRootEncapsulations } from "@/ast-graph/languages/typescript/encapsulations"
import { readImportVariables } from "@/ast-graph/languages/typescript/imports"
import type { SyntaxTree } from "@/ast-graph/parser"
import type { Encapsulation, FileVariable, ImportVariable, SymbolReference } from "@/ast-graph/types"
import { JSX_GRAMMAR, readJsxReferences } from "./references"

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
}
