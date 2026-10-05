import { queryCaptures, type GrammarId, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import type { SymbolSpace, VariableType } from "@/ast-graph/types"

export const VALUE_SPACE: readonly SymbolSpace[] = ["value"]
export const TYPE_SPACE: readonly SymbolSpace[] = ["type"]
export const VALUE_AND_TYPE_SPACES: readonly SymbolSpace[] = ["value", "type"]

const FUNCTION_VALUE_TYPES: ReadonlySet<string> = new Set(["arrow_function", "function_expression", "generator_function"])
const CLASS_VALUE_TYPE = "class"
const QUOTED_TYPES: ReadonlySet<string> = new Set(["string", "template_string"])
const SUBSTITUTION_TYPE = "template_substitution"
const WRAPPER_FIELD = "declaration"
const EXPORT_TYPE = "export_statement"
const AMBIENT_TYPE = "ambient_declaration"
const COMMENT_TYPE = "comment"

export const isSameNode = (one: SyntaxNode | null, two: SyntaxNode | null): boolean =>
  one !== null && two !== null && one.id === two.id

export const isFieldOf = (node: SyntaxNode, field: string): boolean =>
  isSameNode(node.parent?.childForFieldName(field) ?? null, node)

export const isFunctionValue = (value: SyntaxNode | null): boolean => value !== null && FUNCTION_VALUE_TYPES.has(value.type)

export const isClassValue = (value: SyntaxNode | null): boolean => value?.type === CLASS_VALUE_TYPE

export const variableTypeOf = (value: SyntaxNode | null): VariableType => {
  if (isFunctionValue(value)) return "function"
  return isClassValue(value) ? "class" : "primitive"
}

export const isQuoted = (node: SyntaxNode): boolean =>
  QUOTED_TYPES.has(node.type) && node.namedChildren.every((child) => child.type !== SUBSTITUTION_TYPE)

export const unquoted = (literal: string): string => literal.slice(1, -1)

export const textOfName = (name: SyntaxNode): string => (isQuoted(name) ? unquoted(name.text) : name.text)

export const leftmostIdentifierOf = (name: SyntaxNode): SyntaxNode => {
  const object = name.childForFieldName("object")
  return object === null ? name : leftmostIdentifierOf(object)
}

export const declarationIn = (statement: SyntaxNode): SyntaxNode | null => {
  if (statement.type === EXPORT_TYPE) {
    const exported = statement.childForFieldName(WRAPPER_FIELD)
    return exported === null ? null : declarationIn(exported)
  }
  return statement.type === AMBIENT_TYPE ? statement.firstNamedChild : statement
}

export const nextStatementOf = (statement: SyntaxNode): SyntaxNode | null => {
  const next = statement.nextNamedSibling
  return next?.type === COMMENT_TYPE ? nextStatementOf(next) : next
}

export const patternOfTypes = (types: readonly string[]): string => `[${types.map((type) => `(${type})`).join(" ")}] @node`

export const nodesMatching = (grammar: GrammarId, tree: SyntaxTree, pattern: string): SyntaxNode[] =>
  queryCaptures(grammar, tree.rootNode, pattern).map((capture) => capture.node)
