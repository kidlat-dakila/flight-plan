import { readJsxReferences } from "@/ast-graph/languages/jsx/references"
import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readRootEncapsulations } from "@/ast-graph/languages/typescript/encapsulations"
import { readImportVariables } from "@/ast-graph/languages/typescript/imports"
import { readReferences } from "@/ast-graph/languages/typescript/references"
import { parseWithGrammar, type SyntaxTree } from "@/ast-graph/parser"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import type { Declaration, Encapsulation, FileVariable, ImportVariable, SourceRange, SymbolReference } from "@/ast-graph/types"
import { scriptTextOf } from "./blanked"
import { hasSetup, type ScriptBlock, type Sfc } from "./sfc"

export const COMPONENT_NAME = "default"

export interface ParsedScript {
  readonly block: ScriptBlock
  readonly tree: SyntaxTree
  readonly placeScope: (range: SourceRange) => SourceRange
}

export const parseScripts = (sfc: Sfc, source: string): ParsedScript[] =>
  sfc.scripts.map((block) => {
    const tree = parseWithGrammar(block.grammar, scriptTextOf(source, block))
    const moduleScope = rangeOf(tree.rootNode)
    const seenFrom = hasSetup(sfc) ? sfc.fileRange : { start: moduleScope.start, end: rangeOf(block.body).end }
    return { block, tree, placeScope: (scope) => (isSameRange(scope, moduleScope) ? seenFrom : scope) }
  })

const placeDeclaration = <Placed extends Declaration>({ placeScope }: ParsedScript, declaration: Placed): Placed => ({
  ...declaration,
  scope: placeScope(declaration.scope),
})

const encapsulationsOf = (script: ParsedScript): Encapsulation[] => {
  const roots = readRootEncapsulations(script.block.grammar, script.tree)
  if (!script.block.isSetup) return roots
  const declared = roots.flatMap((root) => (root.kind === "variable" ? root.encapsulations : [root]))
  return [{ name: COMPONENT_NAME, kind: "function", range: rangeOf(script.block.element), encapsulations: declared }]
}

const referencesOf = ({ block, tree }: ParsedScript): SymbolReference[] =>
  block.grammar === "tsx" ? readJsxReferences(tree) : readReferences(block.grammar, tree)

export const readScriptVariables = (scripts: readonly ParsedScript[]): FileVariable[] =>
  scripts.flatMap((script) =>
    readFileVariables(script.block.grammar, script.tree).map((variable) => placeDeclaration(script, variable)),
  )

export const readScriptImports = (scripts: readonly ParsedScript[], filePaths: ReadonlyMap<string, string>): ImportVariable[] =>
  scripts.flatMap((script) =>
    readImportVariables(script.block.grammar, script.tree, filePaths).map((variable) => placeDeclaration(script, variable)),
  )

export const readScriptReferences = (scripts: readonly ParsedScript[]): SymbolReference[] =>
  scripts.flatMap(referencesOf)

export const readScriptEncapsulations = (scripts: readonly ParsedScript[]): Encapsulation[] => scripts.flatMap(encapsulationsOf)
