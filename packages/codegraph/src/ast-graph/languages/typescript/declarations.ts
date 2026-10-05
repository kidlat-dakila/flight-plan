import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { rangeOf } from "@/ast-graph/source-range"
import type { DeclarationType, FileVariable, SymbolSpace, VariableType } from "@/ast-graph/types"
import { isExportedRequire, isRequireDeclarator } from "./imports"
import { bindingNamesIn } from "./patterns"
import { blockScopeOf, declaratorScopeOf, functionScopeOf } from "./scopes"
import { declarationIn, leftmostIdentifierOf, nextStatementOf, TYPE_SPACE, VALUE_AND_TYPE_SPACES, VALUE_SPACE, variableTypeOf } from "./syntax"

interface Traits {
  readonly declarationType: DeclarationType
  readonly type: VariableType
  readonly spaces: readonly SymbolSpace[]
}

type ScopeOf = (node: SyntaxNode) => SyntaxNode
type ReadDeclarations = (node: SyntaxNode) => FileVariable[]

const FUNCTION: Traits = { declarationType: "inline-declaration", type: "function", spaces: VALUE_SPACE }
const CLASS: Traits = { declarationType: "inline-declaration", type: "class", spaces: VALUE_AND_TYPE_SPACES }
const TYPE: Traits = { declarationType: "inline-declaration", type: "type", spaces: TYPE_SPACE }
const TYPE_ARGUMENT: Traits = { declarationType: "argument", type: "type", spaces: TYPE_SPACE }
const VALUE: Traits = { declarationType: "inline-declaration", type: "primitive", spaces: VALUE_SPACE }
const ARGUMENT: Traits = { declarationType: "argument", type: "primitive", spaces: VALUE_SPACE }
const NAMESPACE: Traits = { declarationType: "inline-declaration", type: "primitive", spaces: VALUE_AND_TYPE_SPACES }

const NAME_TYPES: ReadonlySet<string> = new Set(["identifier", "type_identifier", "nested_identifier"])
const SINGLE_NAME_TYPE = "identifier"
const TYPE_NAME_TYPE = "type_identifier"
const THIS_TYPE = "this"
const HOISTING_KIND = "var"
const DEFAULT_KEYWORD = "default"
const OVERLOADABLE_TYPES: ReadonlySet<string> = new Set(["function_signature", "function_declaration", "generator_function_declaration"])
const CONDITIONAL_TYPE = "conditional_type"
const STATEMENT_WRAPPER_TYPES: ReadonlySet<string> = new Set(["export_statement", "ambient_declaration"])

const itself: ScopeOf = (node) => node

const variableOf = (name: SyntaxNode, scope: SyntaxNode, traits: Traits): FileVariable => ({
  name: name.text,
  range: rangeOf(name),
  scope: rangeOf(scope),
  ...traits,
})

const readNamed
  = (traits: Traits, scopeOf: ScopeOf): ReadDeclarations =>
    (node) => {
      const name = node.childForFieldName("name")
      if (name === null || !NAME_TYPES.has(name.type)) return []
      return [variableOf(leftmostIdentifierOf(name), scopeOf(node), traits)]
    }

const statementOf = (declaration: SyntaxNode): SyntaxNode =>
  declaration.parent !== null && STATEMENT_WRAPPER_TYPES.has(declaration.parent.type) ? statementOf(declaration.parent) : declaration

const isOverloadOf = (signature: SyntaxNode): boolean => {
  const next = nextStatementOf(statementOf(signature))
  const following = next === null ? null : declarationIn(next)
  if (following === null || !OVERLOADABLE_TYPES.has(following.type)) return false
  return following.childForFieldName("name")?.text === signature.childForFieldName("name")?.text
}

const readFunctionSignature: ReadDeclarations = (signature) =>
  isOverloadOf(signature) ? [] : readNamed(FUNCTION, blockScopeOf)(signature)

const readDeclarator: ReadDeclarations = (declarator) => {
  const pattern = declarator.childForFieldName("name")
  if (pattern === null || isRequireDeclarator(declarator)) return []
  const type = pattern.type === SINGLE_NAME_TYPE ? variableTypeOf(declarator.childForFieldName("value")) : "primitive"
  const scope = declaratorScopeOf(declarator)
  return bindingNamesIn(pattern).map((name) => variableOf(name, scope, { ...VALUE, type }))
}

const readLoopVariables: ReadDeclarations = (loop) => {
  const kind = loop.childForFieldName("kind")
  const pattern = loop.childForFieldName("left")
  if (kind === null || pattern === null) return []
  const scope = kind.type === HOISTING_KIND ? functionScopeOf(loop) : loop
  return bindingNamesIn(pattern).map((name) => variableOf(name, scope, VALUE))
}

const readCaught: ReadDeclarations = (clause) => {
  const pattern = clause.childForFieldName("parameter")
  return pattern === null ? [] : bindingNamesIn(pattern).map((name) => variableOf(name, clause, VALUE))
}

const readParameter: ReadDeclarations = (parameter) => {
  const pattern = parameter.childForFieldName("pattern")
  if (pattern === null || pattern.type === THIS_TYPE) return []
  const scope = functionScopeOf(parameter)
  return bindingNamesIn(pattern).map((name) => variableOf(name, scope, ARGUMENT))
}

const readBareParameter: ReadDeclarations = (arrow) => {
  const name = arrow.childForFieldName("parameter")
  return name === null ? [] : [variableOf(name, arrow, ARGUMENT)]
}

const readTypeParameter: ReadDeclarations = (parameter) => {
  const owner = parameter.parent?.parent ?? null
  return owner === null ? [] : readNamed(TYPE_ARGUMENT, () => owner)(parameter)
}

const readInferred: ReadDeclarations = (inferred) => {
  const name = inferred.namedChildren.find((child) => child.type === TYPE_NAME_TYPE)
  if (name === undefined) return []
  return [variableOf(name, inferred.closest(CONDITIONAL_TYPE) ?? blockScopeOf(inferred), TYPE)]
}

const readMappedKey: ReadDeclarations = (clause) => readNamed(TYPE, () => clause.parent ?? clause)(clause)

const readImportAlias: ReadDeclarations = (alias) => {
  const name = alias.namedChildren.find((child) => child.type === SINGLE_NAME_TYPE)
  return name === undefined || isExportedRequire(alias) ? [] : [variableOf(name, blockScopeOf(alias), NAMESPACE)]
}

const readAnonymousDefault: ReadDeclarations = (statement) => {
  const value = statement.childForFieldName("value")
  const keyword = statement.children.find((child) => child.type === DEFAULT_KEYWORD)
  if (value === null || keyword === undefined || value.type === SINGLE_NAME_TYPE) return []
  return [variableOf(keyword, statement.tree.rootNode, { declarationType: "anonymous", type: variableTypeOf(value), spaces: VALUE_SPACE })]
}

const READERS: ReadonlyMap<string, ReadDeclarations> = new Map<string, ReadDeclarations>([
  ["function_declaration", readNamed(FUNCTION, blockScopeOf)],
  ["generator_function_declaration", readNamed(FUNCTION, blockScopeOf)],
  ["function_signature", readFunctionSignature],
  ["function_expression", readNamed(FUNCTION, itself)],
  ["generator_function", readNamed(FUNCTION, itself)],
  ["arrow_function", readBareParameter],
  ["class_declaration", readNamed(CLASS, blockScopeOf)],
  ["abstract_class_declaration", readNamed(CLASS, blockScopeOf)],
  ["class", readNamed(CLASS, itself)],
  ["interface_declaration", readNamed(TYPE, blockScopeOf)],
  ["type_alias_declaration", readNamed(TYPE, blockScopeOf)],
  ["enum_declaration", readNamed(NAMESPACE, blockScopeOf)],
  ["internal_module", readNamed(NAMESPACE, blockScopeOf)],
  ["module", readNamed(NAMESPACE, blockScopeOf)],
  ["import_alias", readImportAlias],
  ["type_parameter", readTypeParameter],
  ["infer_type", readInferred],
  ["mapped_type_clause", readMappedKey],
  ["index_signature", readNamed(ARGUMENT, itself)],
  ["variable_declarator", readDeclarator],
  ["for_in_statement", readLoopVariables],
  ["catch_clause", readCaught],
  ["required_parameter", readParameter],
  ["optional_parameter", readParameter],
  ["export_statement", readAnonymousDefault],
])

const DECLARING_PATTERN = patternOfTypes([...READERS.keys()])

export const readFileVariables = (grammar: GrammarId, tree: SyntaxTree): FileVariable[] =>
  nodesMatching(grammar, tree, DECLARING_PATTERN).flatMap((node) => READERS.get(node.type)?.(node) ?? [])
