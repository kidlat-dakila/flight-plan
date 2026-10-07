import { nestStatements, type FoundArm, type FoundStatement } from "@/ast-graph/languages/nest-statements"
import { queryCaptures, type GrammarId, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import type { ArmRole, Statement, StatementType } from "@/ast-graph/types"

const EXPORT_TYPE = "export_statement"
const BLOCK_TYPE = "statement_block"
const NAME_TYPE = "identifier"
const LINE_BREAK = "\n"
const KEY_SEPARATOR = ":"
const BLOCK_OPENING = /\s*\{$/u
const ENCLOSING_PARENTHESES = /^\((?<inner>.*)\)$/su

const STATEMENT_TYPES: ReadonlyMap<string, StatementType> = new Map([
  ["lexical_declaration", "declaration"],
  ["variable_declaration", "declaration"],
  ["function_declaration", "declaration"],
  ["generator_function_declaration", "declaration"],
  ["class_declaration", "declaration"],
  ["abstract_class_declaration", "declaration"],
  ["method_definition", "declaration"],
  ["enum_declaration", "declaration"],
  ["expression_statement", "expression"],
  ["if_statement", "conditional"],
  ["switch_statement", "conditional"],
  ["for_statement", "loop"],
  ["for_in_statement", "loop"],
  ["while_statement", "loop"],
  ["do_statement", "loop"],
  ["try_statement", "try"],
  ["return_statement", "return"],
  ["throw_statement", "throw"],
  ["break_statement", "jump"],
  ["continue_statement", "jump"],
  ["import_statement", "import"],
  ["type_alias_declaration", "type"],
  ["interface_declaration", "type"],
  ["ambient_declaration", "type"],
])

const STATEMENT_PATTERN = patternOfTypes([...STATEMENT_TYPES.keys(), EXPORT_TYPE])

const RETURNED_EXPRESSION_PATTERN = `
(variable_declarator value: (arrow_function body: (_) @node))
(pair value: (arrow_function body: (_) @node))
(export_statement value: (arrow_function body: (_) @node))
`

const ARM_PATTERN = `
(if_statement consequence: (_) @then)
(if_statement alternative: (else_clause) @else)
(ternary_expression consequence: (_) @then alternative: (_) @else)
(binary_expression operator: "&&" right: (_) @then)
(binary_expression operator: "||" right: (_) @else)
(binary_expression operator: "??" right: (_) @else)
(switch_case) @case
(switch_default) @case
(for_in_statement body: (_) @each)
(for_statement body: (_) @body)
(while_statement body: (_) @body)
(do_statement body: (_) @body)
(try_statement body: (_) @try)
(catch_clause) @catch
(finally_clause) @finally
(call_expression
  function: (member_expression property: (property_identifier) @method)
  arguments: (arguments . [(arrow_function) (function_expression)] @each)
  (#match? @method "^(map|flatMap|forEach)$"))
`

const ARM_ROLES: ReadonlySet<string> = new Set<ArmRole>(["then", "else", "each", "body", "case", "try", "catch", "finally"])
const DEFAULT_CASE_LABEL = "default"

const isArmRole = (name: string): name is ArmRole => ARM_ROLES.has(name)

const firstLineOf = (node: SyntaxNode): string => node.text.split(LINE_BREAK)[0].trim().replace(BLOCK_OPENING, "")

const unwrapped = (text: string): string => ENCLOSING_PARENTHESES.exec(text)?.groups?.inner ?? text

const textOfField = (node: SyntaxNode | null, field: string): string | null => {
  const child = node?.childForFieldName(field) ?? null
  return child === null ? null : unwrapped(firstLineOf(child))
}

const typeOfExport = (statement: SyntaxNode): StatementType[] => {
  if (statement.childForFieldName("declaration") !== null) return []
  const value = statement.childForFieldName("value")
  return [value === null || value.type === NAME_TYPE ? "import" : "declaration"]
}

const typesOf = (node: SyntaxNode): StatementType[] => {
  if (node.type === EXPORT_TYPE) return typeOfExport(node)
  const type = STATEMENT_TYPES.get(node.type)
  return type === undefined ? [] : [type]
}

const readStatements = (grammar: GrammarId, tree: SyntaxTree): FoundStatement[] =>
  nodesMatching(grammar, tree, STATEMENT_PATTERN).flatMap((node) =>
    typesOf(node).map((type): FoundStatement => ({ kind: "statement", node, type, text: firstLineOf(node) })))

const readReturnedExpressions = (grammar: GrammarId, tree: SyntaxTree): FoundStatement[] =>
  nodesMatching(grammar, tree, RETURNED_EXPRESSION_PATTERN)
    .filter((node) => node.type !== BLOCK_TYPE)
    .map((node) => ({ kind: "statement", node, type: "return", text: firstLineOf(node) }))

const iteratedBy = (callback: SyntaxNode): string | null => {
  const callee = callback.parent?.parent?.childForFieldName("function") ?? null
  return textOfField(callee, "object")
}

const subjectOf = (role: ArmRole, node: SyntaxNode): string | null => {
  const holder = node.parent
  if (role === "each") return holder?.type === "for_in_statement" ? textOfField(holder, "right") : iteratedBy(node)
  if (role === "body") return textOfField(holder, "condition")
  if (role !== "then" && role !== "else") return null
  return textOfField(holder, "condition") ?? textOfField(holder, "left")
}

const labelOf = (role: ArmRole, node: SyntaxNode): string => {
  if (role !== "case") return role
  const value = textOfField(node, "value")
  return value === null ? DEFAULT_CASE_LABEL : `case ${value}`
}

const readArms = (grammar: GrammarId, tree: SyntaxTree): FoundArm[] =>
  queryCaptures(grammar, tree.rootNode, ARM_PATTERN).flatMap(({ name, node }): FoundArm[] =>
    isArmRole(name) ? [{ kind: "arm", node, role: name, label: labelOf(name, node), subject: subjectOf(name, node) }] : [])

const readMarkup = (grammar: GrammarId, tree: SyntaxTree, markupPattern: string | null): FoundStatement[] =>
  markupPattern === null
    ? []
    : nodesMatching(grammar, tree, markupPattern).map((node) => ({ kind: "statement", node, type: "markup", text: firstLineOf(node) }))

const startKeyOf = ({ node }: FoundStatement): string => [node.startIndex, node.endIndex].join(KEY_SEPARATOR)

const withoutRepeats = (found: readonly FoundStatement[]): FoundStatement[] => {
  const keys = found.map(startKeyOf)
  return found.filter((_statement, position) => keys.indexOf(keys[position]) === position)
}

export const readFileStatements = (grammar: GrammarId, tree: SyntaxTree, markupPattern: string | null = null): Statement[] =>
  nestStatements(
    withoutRepeats([...readStatements(grammar, tree), ...readReturnedExpressions(grammar, tree), ...readMarkup(grammar, tree, markupPattern)]),
    readArms(grammar, tree),
  )
