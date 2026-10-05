import { BaseASTGraphFile } from "@/ast-graph/languages/base"
import type { SyntaxTree } from "@/ast-graph/parser"
import { rangeOf } from "@/ast-graph/source-range"
import type { Encapsulation, FileVariable, ImportVariable, SymbolReference } from "@/ast-graph/types"
import { COMPONENT_NAME, readScriptEncapsulations, readScriptImports, readScriptReferences, readScriptVariables } from "./script"
import { openingTagOf, readSfc, type Sfc } from "./sfc"
import { readTemplateNames } from "./template"

const isBefore = (one: Encapsulation, two: Encapsulation): number => one.range.start.line - two.range.start.line

const templateEncapsulationOf = ({ template }: Sfc): Encapsulation[] =>
  template === null ? [] : [{ name: COMPONENT_NAME, kind: "function", range: rangeOf(template), encapsulations: [] }]

const impliedComponentOf = (sfc: Sfc, declared: readonly FileVariable[]): FileVariable[] => {
  const holder = sfc.scripts.find((script) => script.isSetup)?.element ?? sfc.template
  const openingTag = holder === null ? null : openingTagOf(holder)
  if (openingTag === null || declared.some((variable) => variable.name === COMPONENT_NAME)) return []
  return [
    {
      name: COMPONENT_NAME,
      range: rangeOf(openingTag),
      scope: sfc.fileRange,
      spaces: ["value"],
      declarationType: "anonymous",
      type: "primitive",
    },
  ]
}

export class VueASTGraphFile extends BaseASTGraphFile {
  protected extractRootEncapsulations(tree: SyntaxTree): readonly Encapsulation[] {
    const sfc = readSfc(tree)
    return [...readScriptEncapsulations(sfc), ...templateEncapsulationOf(sfc)].sort(isBefore)
  }

  protected extractFileVariables(tree: SyntaxTree): readonly FileVariable[] {
    const sfc = readSfc(tree)
    const declared = [...readScriptVariables(sfc), ...readTemplateNames(sfc.template).variables]
    return [...declared, ...impliedComponentOf(sfc, declared)]
  }

  protected extractImportVariables(tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): readonly ImportVariable[] {
    return readScriptImports(readSfc(tree), importedFilePaths)
  }

  protected extractReferences(tree: SyntaxTree): readonly SymbolReference[] {
    const sfc = readSfc(tree)
    return [...readScriptReferences(sfc), ...readTemplateNames(sfc.template).references]
  }
}
