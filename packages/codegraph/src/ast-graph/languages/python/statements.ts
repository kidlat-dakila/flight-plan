import { nestStatements, type FoundArm, type FoundStatement } from "@/ast-graph/languages/nest-statements"
import { queryCaptures, type SyntaxNode, type SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import type { ArmRole, Statement, StatementType } from "@/ast-graph/types"
import { PYTHON_GRAMMAR } from "./bindings"

const DECORATED_TYPE = "decorated_definition"
const EXPRESSION_TYPE = "expression_statement"
const ASSIGNMENT_TYPE = "assignment"
const LOOP_TYPE = "for_statement"
const LINE_BREAK = "\n"
const BLOCK_OPENING = /\s*:$/u

const DEFINITION_TYPES: ReadonlySet<string> = new Set(["function_definition", "class_definition"])

const STATEMENT_TYPES: ReadonlyMap<string, StatementType> = new Map([
  [DECORATED_TYPE, "declaration"],
  ["function_definition", "declaration"],
  ["class_definition", "declaration"],
  [EXPRESSION_TYPE, "expression"],
  ["assert_statement", "expression"],
  ["delete_statement", "expression"],
  ["with_statement", "expression"],
  ["if_statement", "conditional"],
  ["match_statement", "conditional"],
  [LOOP_TYPE, "loop"],
  ["while_statement", "loop"],
  ["try_statement", "try"],
  ["return_statement", "return"],
  ["raise_statement", "throw"],
  ["break_statement", "jump"],
  ["continue_statement", "jump"],
  ["import_statement", "import"],
  ["import_from_statement", "import"],
  ["future_import_statement", "import"],
  ["type_alias_statement", "type"],
])

const STATEMENT_PATTERN = patternOfTypes([...STATEMENT_TYPES.keys()])

const ARM_PATTERN = `
(if_statement consequence: (_) @then)
(if_statement alternative: (elif_clause consequence: (_) @then))
(if_statement alternative: (else_clause) @else)
(boolean_operator operator: "and" right: (_) @then)
(boolean_operator operator: "or" right: (_) @else)
(case_clause) @case
(for_statement body: (_) @each)
(while_statement body: (_) @body)
(try_statement body: (_) @try)
(except_clause) @catch
(finally_clause) @finally
`

const ARM_ROLES: ReadonlySet<string> = new Set<ArmRole>(["then", "else", "each", "body", "case", "try", "catch", "finally"])

const isArmRole = (name: string): name is ArmRole => ARM_ROLES.has(name)

const firstLineOf = (node: SyntaxNode): string => node.text.split(LINE_BREAK)[0].trim().replace(BLOCK_OPENING, "")

const textOfField = (node: SyntaxNode | null, field: string): string | null => {
  const child = node?.childForFieldName(field) ?? null
  return child === null ? null : firstLineOf(child)
}

const isDecorated = (definition: SyntaxNode): boolean => DEFINITION_TYPES.has(definition.type) && definition.parent?.type === DECORATED_TYPE

const typeOfExpression = (statement: SyntaxNode): StatementType => (statement.firstNamedChild?.type === ASSIGNMENT_TYPE ? "declaration" : "expression")

const typesOf = (node: SyntaxNode): StatementType[] => {
  if (isDecorated(node)) return []
  if (node.type === EXPRESSION_TYPE) return [typeOfExpression(node)]
  const type = STATEMENT_TYPES.get(node.type)
  return type === undefined ? [] : [type]
}

const readStatements = (tree: SyntaxTree): FoundStatement[] =>
  nodesMatching(PYTHON_GRAMMAR, tree, STATEMENT_PATTERN).flatMap((node) =>
    typesOf(node).map((type): FoundStatement => ({ kind: "statement", node, type, text: firstLineOf(node) })))

const subjectOf = (role: ArmRole, node: SyntaxNode): string | null => {
  const holder = node.parent
  if (role === "each") return textOfField(holder, "right")
  if (role === "body") return textOfField(holder, "condition")
  if (role !== "then" && role !== "else") return null
  return textOfField(holder, "condition") ?? textOfField(holder, "left")
}

const labelOf = (role: ArmRole, node: SyntaxNode): string => (role === "case" ? firstLineOf(node) : role)

const readArms = (tree: SyntaxTree): FoundArm[] =>
  queryCaptures(PYTHON_GRAMMAR, tree.rootNode, ARM_PATTERN).flatMap(({ name, node }): FoundArm[] =>
    isArmRole(name) ? [{ kind: "arm", node, role: name, label: labelOf(name, node), subject: subjectOf(name, node) }] : [])

export const readFileStatements = (tree: SyntaxTree): Statement[] => nestStatements(readStatements(tree), readArms(tree))
