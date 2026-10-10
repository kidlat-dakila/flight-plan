import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import { readJsxReferences } from "@/ast-graph/languages/jsx/references"
import { readFileVariables } from "@/ast-graph/languages/typescript/declarations"
import { readExportAliases, readReExports } from "@/ast-graph/languages/typescript/exports"
import { readImportVariables } from "@/ast-graph/languages/typescript/imports"
import { bindingNamesIn } from "@/ast-graph/languages/typescript/patterns"
import { readReferences } from "@/ast-graph/languages/typescript/references"
import { functionScopeOf } from "@/ast-graph/languages/typescript/scopes"
import { isSameNode } from "@/ast-graph/languages/typescript/syntax"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { containsPosition, containsRange, isSameRange, positionKey, rangeOf } from "@/ast-graph/source-range"
import type { FileVariable, ImportVariable, SourceRange as SyntaxRange, SymbolReference, SymbolSpace } from "@/ast-graph/types"
import { groupBy } from "@/shared/group-by"

export interface LocalResolution {
  readonly kind: "local"
  readonly declaration: FileVariable
}

export interface ImportResolution {
  readonly kind: "import"
  readonly variable: ImportVariable
}

export type Resolution = LocalResolution | ImportResolution

export interface ResolvedReference {
  readonly reference: SymbolReference
  readonly resolution: Resolution
}

export interface LocalExport {
  readonly exportedName: string
  readonly declaration: FileVariable
}

export interface ForwardedExport {
  readonly exportedName: string
  readonly importedName: string
  readonly filePath: string | null
}

export interface FileOutline {
  readonly tree: SyntaxTree
  readonly declarations: readonly FileVariable[]
  readonly imports: readonly ImportVariable[]
  readonly resolved: readonly ResolvedReference[]
  readonly resolutionByStart: ReadonlyMap<string, Resolution>
  readonly localExports: readonly LocalExport[]
  readonly forwardedExports: readonly ForwardedExport[]
}

const JSX_GRAMMAR: GrammarId = "tsx"
const EXPORT_TYPE = "export_statement"
const DEFAULT_KEYWORD = "default"
const DEFAULT_EXPORT = "default"
const DECLARATOR_TYPE = "variable_declarator"
const ANONYMOUS: FileVariable["declarationType"] = "anonymous"

const scopeOf = (resolution: Resolution): SyntaxRange =>
  resolution.kind === "local" ? resolution.declaration.scope : resolution.variable.scope

const narrowestScopeOf = (candidates: readonly Resolution[]): SyntaxRange | null =>
  candidates
    .map(scopeOf)
    .reduce<SyntaxRange | null>((best, scope) => (best === null || containsRange(best, scope) ? scope : best), null)

const spacesOf = (resolution: Resolution): readonly SymbolSpace[] =>
  resolution.kind === "local" ? resolution.declaration.spaces : resolution.variable.spaces

const nearestIn = (visible: readonly Resolution[], space: SymbolSpace): Resolution | null => {
  const inSpace = visible.filter((candidate) => spacesOf(candidate).includes(space))
  const nearest = narrowestScopeOf(inSpace)
  if (nearest === null) return null
  return inSpace.find((candidate) => isSameRange(scopeOf(candidate), nearest)) ?? null
}

const resolve = (named: readonly Resolution[], { range, spaces }: SymbolReference): Resolution | null => {
  const visible = named.filter((candidate) => containsPosition(scopeOf(candidate), range.start))
  return spaces.map((space) => nearestIn(visible, space)).find((resolution) => resolution !== null) ?? null
}

const nameOf = (resolution: Resolution): string =>
  resolution.kind === "local" ? resolution.declaration.name : resolution.variable.name

export const resolveAll = (candidates: readonly Resolution[], references: readonly SymbolReference[]): ResolvedReference[] => {
  const candidatesByName = groupBy(candidates, nameOf)
  return references.flatMap((reference) => {
    const resolution = resolve(candidatesByName.get(reference.name) ?? [], reference)
    return resolution === null ? [] : [{ reference, resolution }]
  })
}

const isDefaultExport = (statement: SyntaxNode): boolean => statement.children.some((child) => child.type === DEFAULT_KEYWORD)

const declaredNamesOf = (declaration: SyntaxNode): SyntaxNode[] => {
  const declarators = declaration.namedChildren.filter((child) => child.type === DECLARATOR_TYPE)
  if (declarators.length > 0) {
    return declarators.flatMap((declarator) => {
      const pattern = declarator.childForFieldName("name")
      return pattern === null ? [] : bindingNamesIn(pattern)
    })
  }
  const name = declaration.childForFieldName("name")
  return name === null ? [] : [name]
}

const inlineExportsOf = (statement: SyntaxNode, declarations: readonly FileVariable[]): LocalExport[] => {
  const declaration = statement.childForFieldName("declaration")
  if (statement.type !== EXPORT_TYPE || declaration === null) return []
  return declaredNamesOf(declaration).flatMap((name) => {
    const declared = declarations.find((candidate) => isSameRange(candidate.range, rangeOf(name)))
    if (declared === undefined) return []
    return [{ exportedName: isDefaultExport(statement) ? DEFAULT_EXPORT : name.text, declaration: declared }]
  })
}

const FIRST_LINE = 1

const pointOf = ({ line, column }: SyntaxRange["start"]): { row: number, column: number } => ({ row: line - FIRST_LINE, column })

const isFileWide = (tree: SyntaxTree, { range, scope }: FileVariable): boolean => {
  if (!isSameRange(scope, rangeOf(tree.rootNode))) return false
  const name = tree.rootNode.namedDescendantForPosition(pointOf(range.start), pointOf(range.end))
  return isSameNode(functionScopeOf(name), tree.rootNode)
}

export const readOutline = (grammar: GrammarId, tree: SyntaxTree, importedFilePaths: ReadonlyMap<string, string>): FileOutline => {
  const declarations = readFileVariables(grammar, tree)
  const imports = readImportVariables(grammar, tree, importedFilePaths)
  const references = grammar === JSX_GRAMMAR ? readJsxReferences(tree) : readReferences(grammar, tree)
  const candidates: readonly Resolution[] = [
    ...declarations.map((declaration): Resolution => ({ kind: "local", declaration })),
    ...imports.map((variable): Resolution => ({ kind: "import", variable })),
  ]
  const resolved = resolveAll(candidates, references)
  const fileWide = declarations.filter((declaration) => isFileWide(tree, declaration))
  const aliases = readExportAliases(grammar, tree)
  const aliased = aliases.flatMap(({ name, exportedName }) =>
    fileWide.filter((declaration) => declaration.name === name).map((declaration) => ({ exportedName, declaration })),
  )
  const anonymous = fileWide
    .filter((declaration) => declaration.declarationType === ANONYMOUS)
    .map((declaration) => ({ exportedName: DEFAULT_EXPORT, declaration }))
  const importForwards = aliases.flatMap(({ name, exportedName }) =>
    imports
      .filter((variable) => variable.name === name)
      .map((variable) => ({ exportedName, importedName: variable.importedName, filePath: variable.importedFilePath })),
  )
  const reExported = readReExports(grammar, tree, importedFilePaths).map(({ exportedName, importedName, importedFilePath }) => ({
    exportedName,
    importedName,
    filePath: importedFilePath,
  }))
  return {
    tree,
    declarations,
    imports,
    resolved,
    resolutionByStart: new Map(resolved.map(({ reference, resolution }) => [positionKey(reference.range.start), resolution] as const)),
    localExports: [...tree.rootNode.namedChildren.flatMap((statement) => inlineExportsOf(statement, declarations)), ...aliased, ...anonymous],
    forwardedExports: [...importForwards, ...reExported],
  }
}

export const resolutionOf = (outline: FileOutline, name: SyntaxNode): Resolution | null =>
  outline.resolutionByStart.get(positionKey(rangeOf(name).start)) ?? null

export const isFileWideDeclaration = (outline: FileOutline, declaration: FileVariable): boolean => isFileWide(outline.tree, declaration)

export const isEveryName = (name: string): boolean => name === NAMESPACE_IMPORT
