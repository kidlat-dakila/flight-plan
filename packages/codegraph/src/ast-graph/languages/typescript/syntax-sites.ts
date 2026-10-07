import { queryCaptures, type GrammarId, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { rangeOf } from "@/ast-graph/source-range"
import type {
  ArgumentSite,
  CalleeSite,
  FirstParameter,
  FunctionSite,
  KeptSite,
  PageSite,
  MemberSite,
  PropertyBinding,
  SymbolTarget,
  SyntaxSite,
} from "@/ast-graph/types"
import { bindingNamesIn } from "./patterns"
import { routePathOf } from "./route-paths"
import { isQuoted, unquoted } from "./syntax"

const CALLEE_PATTERN = "(call_expression function: (_) @node)\n(new_expression constructor: (_) @node)"
const ARGUMENTS_PATTERN = "(call_expression arguments: (arguments) @node)"
const MEMBER_PATTERN = "(member_expression) @node"
const KEEPING_PATTERN = "(variable_declarator value: (_)) @node"
const PAGE_PATTERN = `(pair key: (property_identifier) @key value: (_) @node (#match? @key "^(element|Component|component)$"))`
const PAGE_CAPTURE = "node"
const FUNCTION_PATTERN = patternOfTypes([
  "arrow_function",
  "function_expression",
  "function_declaration",
  "generator_function",
  "generator_function_declaration",
  "method_definition",
])

const CALL_TYPE = "call_expression"
const BLOCK_TYPE = "statement_block"
const DECLARATOR_TYPE = "variable_declarator"
const IDENTIFIER_TYPE = "identifier"
const OBJECT_PATTERN_TYPE = "object_pattern"
const SHORTHAND_TYPE = "shorthand_property_identifier_pattern"
const PAIR_PATTERN_TYPE = "pair_pattern"
const DEFAULTED_TYPE = "object_assignment_pattern"
const TRANSPARENT_TYPES: ReadonlySet<string> = new Set(["await_expression", "parenthesized_expression", "return_statement", "expression_statement"])
const KEPT_THROUGH_TYPES: ReadonlySet<string> = new Set(["await_expression", "parenthesized_expression", "as_expression", "non_null_expression"])
const SINGLE_STATEMENT_COUNT = 1

const targetOf = (name: SyntaxNode): SymbolTarget => ({ name: name.text, range: rangeOf(name) })

const callIn = (node: SyntaxNode | null): SyntaxNode | null => {
  if (node === null) return null
  if (node.type === CALL_TYPE) return node
  return TRANSPARENT_TYPES.has(node.type) ? callIn(node.firstNamedChild) : null
}

const onlyStatementOf = (block: SyntaxNode): SyntaxNode | null =>
  block.namedChildCount === SINGLE_STATEMENT_COUNT ? block.firstNamedChild : null

const wrappedCallOf = (body: SyntaxNode | null): SyntaxNode | null => {
  if (body === null) return null
  return callIn(body.type === BLOCK_TYPE ? onlyStatementOf(body) : body)
}

const bindingOfProperty = (property: SyntaxNode): PropertyBinding[] => {
  if (property.type === SHORTHAND_TYPE) return [{ property: property.text, binding: targetOf(property) }]
  if (property.type === DEFAULTED_TYPE) {
    const defaulted = property.childForFieldName("left")
    return defaulted === null ? [] : bindingOfProperty(defaulted)
  }
  if (property.type !== PAIR_PATTERN_TYPE) return []
  const key = property.childForFieldName("key")
  const value = property.childForFieldName("value")
  return key === null || value?.type !== IDENTIFIER_TYPE ? [] : [{ property: key.text, binding: targetOf(value) }]
}

const parameterOf = (pattern: SyntaxNode | null): FirstParameter | null => {
  if (pattern === null) return null
  if (pattern.type === IDENTIFIER_TYPE) return { name: targetOf(pattern), properties: [] }
  return pattern.type === OBJECT_PATTERN_TYPE ? { name: null, properties: pattern.namedChildren.flatMap(bindingOfProperty) } : null
}

const toKeptSite = (declarator: SyntaxNode): KeptSite[] => {
  const value = declarator.childForFieldName("value")
  const bound = parameterOf(declarator.childForFieldName("name"))
  return value === null || bound === null ? [] : [{ kind: "kept", range: rangeOf(value), ...bound }]
}

const firstParameterOf = (node: SyntaxNode): FirstParameter | null => {
  const single = node.childForFieldName("parameter")
  if (single !== null) return parameterOf(single)
  const first = node.childForFieldName("parameters")?.firstNamedChild ?? null
  return parameterOf(first?.childForFieldName("pattern") ?? null)
}

const toFunctionSite = (node: SyntaxNode): FunctionSite => {
  const wrapped = wrappedCallOf(node.childForFieldName("body"))?.childForFieldName("function") ?? null
  return { kind: "function", range: rangeOf(node), wrapped: wrapped === null ? null : rangeOf(wrapped), firstParameter: firstParameterOf(node) }
}

const toCalleeSite = (node: SyntaxNode): CalleeSite => ({ kind: "callee", range: rangeOf(node) })

const toMemberSite = (node: SyntaxNode): MemberSite[] => {
  const object = node.childForFieldName("object")
  const property = node.childForFieldName("property")
  return object === null || property === null ? [] : [{ kind: "member", range: rangeOf(node), object: rangeOf(object), property: property.text }]
}

const keptIn = (node: SyntaxNode): SyntaxNode | null => {
  const { parent } = node
  if (parent === null) return null
  return KEPT_THROUGH_TYPES.has(parent.type) ? keptIn(parent) : parent
}

const resultsOf = (call: SyntaxNode): SymbolTarget[] => {
  const keeper = keptIn(call)
  const pattern = keeper?.type === DECLARATOR_TYPE ? keeper.childForFieldName("name") : null
  return pattern === null ? [] : bindingNamesIn(pattern).map(targetOf)
}

const literalOf = (argumentList: SyntaxNode): string | null => {
  const first = argumentList.firstNamedChild
  return first !== null && isQuoted(first) ? unquoted(first.text) : null
}

const toArgumentSite = (node: SyntaxNode): ArgumentSite[] => {
  const call = node.parent
  const callee = call?.childForFieldName("function") ?? null
  if (call === null || callee === null) return []
  return [{ kind: "argument", range: rangeOf(node), callee: callee.text, literal: literalOf(node), results: resultsOf(call) }]
}

const toPageSite = (value: SyntaxNode): PageSite[] => {
  const route = value.parent?.parent ?? null
  const path = route === null ? null : routePathOf(route)
  return path === null ? [] : [{ kind: "page", range: rangeOf(value), path }]
}

const readPageSites = (grammar: GrammarId, tree: SyntaxTree): PageSite[] =>
  queryCaptures(grammar, tree.rootNode, PAGE_PATTERN)
    .filter((capture) => capture.name === PAGE_CAPTURE)
    .flatMap((capture) => toPageSite(capture.node))

export const readSyntaxSites = (grammar: GrammarId, tree: SyntaxTree): SyntaxSite[] => [
  ...nodesMatching(grammar, tree, CALLEE_PATTERN).map(toCalleeSite),
  ...nodesMatching(grammar, tree, MEMBER_PATTERN).flatMap(toMemberSite),
  ...nodesMatching(grammar, tree, FUNCTION_PATTERN).map(toFunctionSite),
  ...nodesMatching(grammar, tree, ARGUMENTS_PATTERN).flatMap(toArgumentSite),
  ...nodesMatching(grammar, tree, KEEPING_PATTERN).flatMap(toKeptSite),
  ...readPageSites(grammar, tree),
]
