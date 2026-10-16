import type { SyntaxNode } from "@/ast-graph/parser"

const RETURN_TYPE = "return_statement"
const BODY_TYPE = "block"
const NAME_TYPE = "identifier"
const DECORATED_TYPE = "decorated_definition"
const STATEMENT_TYPE = "expression_statement"
const ASSIGNMENT_TYPE = "assignment"
const PARENTHESIZED_TYPE = "parenthesized_expression"

const unwrapped = (value: SyntaxNode): SyntaxNode => {
  const inner = value.type === PARENTHESIZED_TYPE ? value.firstNamedChild : null
  return inner === null ? value : unwrapped(inner)
}

const returnedValueOf = (statement: SyntaxNode): SyntaxNode | null => (statement.type === RETURN_TYPE ? statement.firstNamedChild : null)

const isWrittenAsReturn = (callable: SyntaxNode): boolean => {
  const { parent } = callable
  if (parent === null) return false
  return parent.type === PARENTHESIZED_TYPE ? isWrittenAsReturn(parent) : parent.type === RETURN_TYPE
}

const statementAround = (definition: SyntaxNode): SyntaxNode => {
  if (definition.parent?.type === DECORATED_TYPE) return definition.parent
  if (definition.parent?.type === ASSIGNMENT_TYPE && definition.parent.parent?.type === STATEMENT_TYPE) return definition.parent.parent
  return definition
}

const returnsName = (body: SyntaxNode, name: string): boolean =>
  body.namedChildren.some((statement) => {
    const returned = returnedValueOf(statement)
    return returned !== null && unwrapped(returned).type === NAME_TYPE && unwrapped(returned).text === name
  })

export const isReturnedFunction = (callable: SyntaxNode, name: string | null): boolean => {
  if (isWrittenAsReturn(callable)) return true
  const body = statementAround(callable).parent
  return name !== null && body?.type === BODY_TYPE && returnsName(body, name)
}
