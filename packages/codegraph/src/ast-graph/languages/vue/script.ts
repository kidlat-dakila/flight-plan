import { readJsxReferences } from "@/ast-graph/languages/jsx/references"
import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readRootEncapsulations } from "@/ast-graph/languages/typescript/encapsulations"
import { readImportVariables } from "@/ast-graph/languages/typescript/imports"
import { readReferences } from "@/ast-graph/languages/typescript/references"
import { parseWithGrammar, type SyntaxTree } from "@/ast-graph/parser"
import { isSameRange, rangeOf } from "@/ast-graph/source-range"
import type { Declaration, Encapsulation, FileVariable, ImportVariable, SourceRange, SymbolReference } from "@/ast-graph/types"
import { hasSetup, type ScriptBlock, type Sfc } from "./sfc"
import { placeRange, snippetOf } from "./snippet"

export const COMPONENT_NAME = "default"

interface ParsedScript {
  readonly block: ScriptBlock
  readonly tree: SyntaxTree
  readonly place: (range: SourceRange) => SourceRange
  readonly placeScope: (range: SourceRange) => SourceRange
}

const parseScripts = (sfc: Sfc): ParsedScript[] =>
  sfc.scripts.map((block) => {
    const snippet = snippetOf(block.body)
    const tree = parseWithGrammar(block.grammar, snippet.code)
    const place = placeRange(snippet)
    const moduleScope = rangeOf(tree.rootNode)
    const isSeenByTemplate = hasSetup(sfc)
    return {
      block,
      tree,
      place,
      placeScope: (scope) => (isSeenByTemplate && isSameRange(scope, moduleScope) ? sfc.fileRange : place(scope)),
    }
  })

const placeDeclaration = <Placed extends Declaration>({ place, placeScope }: ParsedScript, declaration: Placed): Placed => ({
  ...declaration,
  range: place(declaration.range),
  scope: placeScope(declaration.scope),
})

const placeEncapsulation = (script: ParsedScript, encapsulation: Encapsulation): Encapsulation => ({
  ...encapsulation,
  range: script.place(encapsulation.range),
  encapsulations: encapsulation.encapsulations.map((nested) => placeEncapsulation(script, nested)),
})

const encapsulationsOf = (script: ParsedScript): Encapsulation[] => {
  const roots = readRootEncapsulations(script.block.grammar, script.tree).map((root) => placeEncapsulation(script, root))
  if (!script.block.isSetup) return roots
  const declared = roots.flatMap((root) => (root.kind === "variable" ? root.encapsulations : [root]))
  return [{ name: COMPONENT_NAME, kind: "function", range: rangeOf(script.block.element), encapsulations: declared }]
}

const referencesOf = ({ block, tree }: ParsedScript): SymbolReference[] =>
  block.grammar === "tsx" ? readJsxReferences(tree) : readReferences(block.grammar, tree)

export const readScriptVariables = (sfc: Sfc): FileVariable[] =>
  parseScripts(sfc).flatMap((script) =>
    readFileVariables(script.block.grammar, script.tree).map((variable) => placeDeclaration(script, variable)),
  )

export const readScriptImports = (sfc: Sfc, filePaths: ReadonlyMap<string, string>): ImportVariable[] =>
  parseScripts(sfc).flatMap((script) =>
    readImportVariables(script.block.grammar, script.tree, filePaths).map((variable) => placeDeclaration(script, variable)),
  )

export const readScriptReferences = (sfc: Sfc): SymbolReference[] =>
  parseScripts(sfc).flatMap((script) => referencesOf(script).map((reference) => ({ ...reference, range: script.place(reference.range) })))

export const readScriptEncapsulations = (sfc: Sfc): Encapsulation[] => parseScripts(sfc).flatMap(encapsulationsOf)
