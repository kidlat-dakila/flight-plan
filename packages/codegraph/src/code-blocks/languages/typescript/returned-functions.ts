import type { SyntaxNode } from "@/ast-graph/parser"
import { isArrowBody, returnedValueOf } from "./markup"

const RETURN_TYPE = "return_statement"
const BODY_TYPE = "statement_block"
const NAME_TYPE = "identifier"
const DECLARATION_TYPES: ReadonlySet<string> = new Set(["lexical_declaration", "variable_declaration"])
const WRAPPING_TYPES: ReadonlySet<string> = new Set(["parenthesized_expression", "as_expression", "satisfies_expression", "non_null_expression"])

const unwrapped = (value: SyntaxNode): SyntaxNode => {
  const inner = WRAPPING_TYPES.has(value.type) ? value.firstNamedChild : null
  return inner === null ? value : unwrapped(inner)
}

const isWrittenAsReturn = (callable: SyntaxNode): boolean => {
  const { parent } = callable
  if (parent === null) return false
  if (WRAPPING_TYPES.has(parent.type)) return isWrittenAsReturn(parent)
  return parent.type === RETURN_TYPE || isArrowBody(callable)
}

const statementAround = (declaration: SyntaxNode): SyntaxNode =>
  declaration.parent !== null && DECLARATION_TYPES.has(declaration.parent.type) ? declaration.parent : declaration

const returnsName = (body: SyntaxNode, name: string): boolean =>
  body.namedChildren.some((statement) => {
    const returned = statement.type === RETURN_TYPE ? returnedValueOf(statement) : null
    return returned !== null && unwrapped(returned).type === NAME_TYPE && unwrapped(returned).text === name
  })

const isReturnedByName = (declaration: SyntaxNode, name: string | null): boolean => {
  const body = statementAround(declaration).parent
  return name !== null && body?.type === BODY_TYPE && returnsName(body, name)
}

export const isReturnedFunction = (callable: SyntaxNode, declaration: SyntaxNode, name: string | null): boolean =>
  isWrittenAsReturn(callable) || isReturnedByName(declaration, name)
