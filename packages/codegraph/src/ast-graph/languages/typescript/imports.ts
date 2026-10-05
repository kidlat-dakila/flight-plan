import { NAMESPACE_IMPORT } from "@/ast-graph/languages/base"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { rangeOf } from "@/ast-graph/source-range"
import type { ImportVariable } from "@/ast-graph/types"
import { bindingNamesIn } from "./patterns"
import { blockScopeOf, declaratorScopeOf } from "./scopes"
import { isQuoted, textOfName, unquoted, VALUE_AND_TYPE_SPACES } from "./syntax"

const DEFAULT_EXPORT = "default"
const REQUIRE_FUNCTION = "require"
const IMPORT_TYPE = "import_statement"
const DECLARATOR_TYPE = "variable_declarator"
const NAME_TYPE = "identifier"
const SHORTHAND_TYPE = "shorthand_property_identifier_pattern"
const DEFAULTED_SHORTHAND_TYPE = "object_assignment_pattern"
const RENAMED_TYPE = "pair_pattern"
const OBJECT_PATTERN_TYPE = "object_pattern"
const PROPERTY_KEY_TYPES: ReadonlySet<string> = new Set(["property_identifier", "string"])
const CALL_TYPE = "call_expression"
const MEMBER_TYPE = "member_expression"
const ONLY_ARGUMENT_COUNT = 1
const ALIAS_TYPE = "import_alias"
const EXPORT_TYPE = "export_statement"
const STATEMENT_TYPE = "expression_statement"

interface ImportedName {
  readonly name: SyntaxNode
  readonly importedName: string
}

interface ImportSource {
  readonly specifier: string
  readonly scope: SyntaxNode
}

interface RequireCall {
  readonly specifier: string
  readonly member: string | null
}

type FilePaths = ReadonlyMap<string, string>

const childrenOfType = (node: SyntaxNode, type: string): SyntaxNode[] => node.namedChildren.filter((child) => child.type === type)

const importVariableOf = ({ name, importedName }: ImportedName, { specifier, scope }: ImportSource, filePaths: FilePaths): ImportVariable => ({
  name: name.text,
  importedName,
  specifier,
  importedFilePath: filePaths.get(specifier) ?? null,
  range: rangeOf(name),
  scope: rangeOf(scope),
  spaces: VALUE_AND_TYPE_SPACES,
})

const specifierNameOf = (specifier: SyntaxNode): ImportedName[] => {
  const imported = specifier.childForFieldName("name")
  const name = specifier.childForFieldName("alias") ?? imported
  if (imported === null || name?.type !== NAME_TYPE) return []
  return [{ name, importedName: textOfName(imported) }]
}

const clauseNamesOf = (clause: SyntaxNode): ImportedName[] => [
  ...childrenOfType(clause, NAME_TYPE).map((name) => ({ name, importedName: DEFAULT_EXPORT })),
  ...childrenOfType(clause, "namespace_import")
    .flatMap((namespace) => childrenOfType(namespace, NAME_TYPE))
    .map((name) => ({ name, importedName: NAMESPACE_IMPORT })),
  ...childrenOfType(clause, "named_imports")
    .flatMap((named) => childrenOfType(named, "import_specifier"))
    .flatMap(specifierNameOf),
]

const readImportStatement = (statement: SyntaxNode, filePaths: FilePaths): ImportVariable[] => {
  const required = childrenOfType(statement, "import_require_clause")
  const source = [statement, ...required].map((holder) => holder.childForFieldName("source")).find((found) => found !== null)
  if (source === undefined) return []
  const names = [
    ...childrenOfType(statement, "import_clause").flatMap(clauseNamesOf),
    ...required.flatMap((clause) => childrenOfType(clause, NAME_TYPE)).map((name) => ({ name, importedName: NAMESPACE_IMPORT })),
  ]
  const importSource = { specifier: unquoted(source.text), scope: blockScopeOf(statement) }
  return names.map((name) => importVariableOf(name, importSource, filePaths))
}

const specifierRequiredBy = (call: SyntaxNode | null): string | null => {
  const callee = call?.childForFieldName("function") ?? null
  const given = call?.childForFieldName("arguments")?.namedChildren ?? []
  if (call?.type !== CALL_TYPE || callee?.type !== NAME_TYPE || callee.text !== REQUIRE_FUNCTION) return null
  if (given.length !== ONLY_ARGUMENT_COUNT || !isQuoted(given[0])) return null
  return unquoted(given[0].text)
}

const requireCallOf = (value: SyntaxNode | null): RequireCall | null => {
  const required = specifierRequiredBy(value)
  if (required !== null) return { specifier: required, member: null }
  const member = value?.type === MEMBER_TYPE ? value.childForFieldName("property") : null
  const specifier = specifierRequiredBy(value?.childForFieldName("object") ?? null)
  if (specifier === null || member === null) return null
  return { specifier, member: member.text }
}

const propertyNamesOf = (property: SyntaxNode): ImportedName[] => {
  if (property.type === SHORTHAND_TYPE) return [{ name: property, importedName: property.text }]
  if (property.type === DEFAULTED_SHORTHAND_TYPE) return bindingNamesIn(property).map((name) => ({ name, importedName: name.text }))
  const key = property.type === RENAMED_TYPE ? property.childForFieldName("key") : null
  const importedName = key !== null && PROPERTY_KEY_TYPES.has(key.type) ? textOfName(key) : NAMESPACE_IMPORT
  return bindingNamesIn(property.childForFieldName("value") ?? property).map((name) => ({ name, importedName }))
}

const requiredNamesOf = (pattern: SyntaxNode, member: string | null): ImportedName[] => {
  if (member !== null) return bindingNamesIn(pattern).map((name) => ({ name, importedName: member }))
  if (pattern.type === OBJECT_PATTERN_TYPE) return pattern.namedChildren.flatMap(propertyNamesOf)
  return bindingNamesIn(pattern).map((name) => ({ name, importedName: NAMESPACE_IMPORT }))
}

const readRequireDeclarator = (declarator: SyntaxNode, filePaths: FilePaths): ImportVariable[] => {
  const required = requireCallOf(declarator.childForFieldName("value"))
  const pattern = declarator.childForFieldName("name")
  if (required === null || pattern === null) return []
  const importSource = { specifier: required.specifier, scope: declaratorScopeOf(declarator) }
  return requiredNamesOf(pattern, required.member).map((name) => importVariableOf(name, importSource, filePaths))
}

const specifierOfExportedRequire = (alias: SyntaxNode): string | null => {
  const target = alias.namedChildren.find((child, index) => index > 0 && child.type === NAME_TYPE)
  const next = alias.parent?.type === EXPORT_TYPE ? alias.parent.nextNamedSibling : null
  const literal = next?.type === STATEMENT_TYPE ? (next.firstNamedChild?.firstNamedChild ?? null) : null
  if (target?.text !== REQUIRE_FUNCTION || literal === null || !isQuoted(literal)) return null
  return unquoted(literal.text)
}

const readExportedRequire = (alias: SyntaxNode, filePaths: FilePaths): ImportVariable[] => {
  const specifier = specifierOfExportedRequire(alias)
  if (specifier === null) return []
  const [name] = childrenOfType(alias, NAME_TYPE)
  return [importVariableOf({ name, importedName: NAMESPACE_IMPORT }, { specifier, scope: blockScopeOf(alias) }, filePaths)]
}

export const isExportedRequire = (alias: SyntaxNode): boolean => specifierOfExportedRequire(alias) !== null

const READERS: ReadonlyMap<string, (node: SyntaxNode, filePaths: FilePaths) => ImportVariable[]> = new Map([
  [IMPORT_TYPE, readImportStatement],
  [DECLARATOR_TYPE, readRequireDeclarator],
  [ALIAS_TYPE, readExportedRequire],
])

export const isRequireDeclarator = (declarator: SyntaxNode): boolean =>
  requireCallOf(declarator.childForFieldName("value")) !== null

const IMPORTING_PATTERN = patternOfTypes([...READERS.keys()])

export const readImportVariables = (grammar: GrammarId, tree: SyntaxTree, filePaths: FilePaths): ImportVariable[] =>
  nodesMatching(grammar, tree, IMPORTING_PATTERN).flatMap((node) => READERS.get(node.type)?.(node, filePaths) ?? [])
