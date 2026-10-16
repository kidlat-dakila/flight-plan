import { DEFAULT_EXPORT, NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import type { ExportAlias, ReExport } from "@/ast-graph/types"
import { textOfName, unquoted } from "./syntax"

const EXPORT_PATTERN = patternOfTypes(["export_statement"])
const CLAUSE_TYPE = "export_clause"
const SPECIFIER_TYPE = "export_specifier"
const NAMESPACE_TYPE = "namespace_export"
const NAME_TYPE = "identifier"
const DEFAULT_KEYWORD = "default"

interface ExportedName {
  readonly name: string
  readonly exportedName: string
}

type FilePaths = ReadonlyMap<string, string>

const childrenOfType = (node: SyntaxNode, type: string): SyntaxNode[] => node.namedChildren.filter((child) => child.type === type)

const specifierNameOf = (specifier: SyntaxNode): ExportedName[] => {
  const name = specifier.childForFieldName("name")
  if (name === null) return []
  return [{ name: textOfName(name), exportedName: textOfName(specifier.childForFieldName("alias") ?? name) }]
}

const clauseNamesOf = (statement: SyntaxNode): ExportedName[] =>
  childrenOfType(statement, CLAUSE_TYPE)
    .flatMap((clause) => childrenOfType(clause, SPECIFIER_TYPE))
    .flatMap(specifierNameOf)

const defaultNameOf = (statement: SyntaxNode): ExportedName[] => {
  if (statement.children.every((child) => child.type !== DEFAULT_KEYWORD)) return []
  const value = statement.childForFieldName("value")
  const name = value?.type === NAME_TYPE ? value : (statement.childForFieldName("declaration")?.childForFieldName("name") ?? null)
  return name === null ? [] : [{ name: name.text, exportedName: DEFAULT_EXPORT }]
}

const namespaceNamesOf = (statement: SyntaxNode): ExportedName[] =>
  childrenOfType(statement, NAMESPACE_TYPE)
    .flatMap((namespace) => namespace.namedChildren)
    .map((name) => ({ name: NAMESPACE_IMPORT, exportedName: textOfName(name) }))

const EVERY_NAME: ExportedName = { name: NAMESPACE_IMPORT, exportedName: NAMESPACE_IMPORT }

const reExportedNamesOf = (statement: SyntaxNode): ExportedName[] => {
  const named = [...clauseNamesOf(statement), ...namespaceNamesOf(statement)]
  const hasClause = childrenOfType(statement, CLAUSE_TYPE).length > 0
  return named.length > 0 || hasClause ? named : [EVERY_NAME]
}

const aliasesOf = (statement: SyntaxNode): ExportAlias[] => [...clauseNamesOf(statement), ...defaultNameOf(statement)]

const reExportsOf = (statement: SyntaxNode, source: SyntaxNode, filePaths: FilePaths): ReExport[] => {
  const specifier = unquoted(source.text)
  return reExportedNamesOf(statement).map(({ name, exportedName }) => ({
    importedName: name,
    exportedName,
    specifier,
    importedFilePath: filePaths.get(specifier) ?? null,
  }))
}

export const readExportAliases = (grammar: GrammarId, tree: SyntaxTree): ExportAlias[] =>
  nodesMatching(grammar, tree, EXPORT_PATTERN)
    .filter((statement) => statement.childForFieldName("source") === null)
    .flatMap(aliasesOf)

export const readReExports = (grammar: GrammarId, tree: SyntaxTree, filePaths: FilePaths): ReExport[] =>
  nodesMatching(grammar, tree, EXPORT_PATTERN).flatMap((statement) => {
    const source = statement.childForFieldName("source")
    return source === null ? [] : reExportsOf(statement, source, filePaths)
  })

const ASSIGNMENT_TYPE = "assignment_expression"
const STATEMENT_TYPE = "expression_statement"
const MODULE_EXPORTS = "module.exports"

export const moduleExportsHolding = (value: SyntaxNode): SyntaxNode | null => {
  const assignment = value.parent
  const target = assignment?.type === ASSIGNMENT_TYPE && assignment.childForFieldName("right")?.id === value.id ? assignment.childForFieldName("left") : null
  return target?.text === MODULE_EXPORTS ? target : null
}

export const listModuleExportValues = (tree: SyntaxTree): SyntaxNode[] =>
  tree.rootNode.namedChildren
    .filter((statement) => statement.type === STATEMENT_TYPE && statement.firstNamedChild?.type === ASSIGNMENT_TYPE)
    .flatMap((statement) => {
      const value = statement.firstNamedChild?.childForFieldName("right") ?? null
      return value !== null && moduleExportsHolding(value) !== null ? [value] : []
    })
