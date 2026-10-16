import { isFieldOf } from "@/ast-graph/languages/typescript/syntax"
import type { SyntaxNode } from "@/ast-graph/parser"
import { collectFromNode } from "@/ast-graph/walk-tree"

const ELEMENT_TYPES: ReadonlySet<string> = new Set(["jsx_element", "jsx_self_closing_element", "jsx_fragment"])
const OPENING_FIELD = "open_tag"
const WRAPPING_TYPES: ReadonlySet<string> = new Set(["parenthesized_expression", "as_expression", "satisfies_expression", "non_null_expression"])
const CONDITION_TYPE = "ternary_expression"
const OPERATION_TYPE = "binary_expression"
const CHOOSING_OPERATORS: ReadonlySet<string> = new Set(["&&", "||", "??"])
const CALL_TYPE = "call_expression"
const MEMBER_TYPE = "member_expression"
const RETURN_TYPE = "return_statement"
const BODY_TYPE = "statement_block"
const ARROW_TYPE = "arrow_function"
const EVENT_NAME_PATTERN = /^on[A-Z]/
const ACTION_ATTRIBUTES: ReadonlySet<string> = new Set(["action", "formAction"])
const EXPRESSION_VALUE_TYPE = "jsx_expression"
const HERITAGE_TYPE = "class_heritage"
const METHOD_TYPE = "method_definition"
const RENDER_METHOD = "render"

export const FUNCTION_TYPES: ReadonlySet<string> = new Set([
  "function_declaration",
  "generator_function_declaration",
  "function_expression",
  "generator_function",
  "arrow_function",
  "method_definition",
])

export const COLLECTION_METHODS: ReadonlySet<string> = new Set([
  "map",
  "filter",
  "forEach",
  "reduce",
  "find",
  "some",
  "every",
  "flatMap",
  "sort",
])

export const unwrapped = (node: SyntaxNode): SyntaxNode => {
  const inner = WRAPPING_TYPES.has(node.type) ? node.firstNamedChild : null
  return inner === null ? node : unwrapped(inner)
}

export const isElement = (node: SyntaxNode): boolean => ELEMENT_TYPES.has(node.type)

export const elementNameOf = (element: SyntaxNode): string | null => {
  const opening = element.childForFieldName(OPENING_FIELD) ?? element
  return opening.childForFieldName("name")?.text ?? null
}

export const isEventName = (name: string): boolean => EVENT_NAME_PATTERN.test(name)

export const attributeNameOf = (attribute: SyntaxNode): string | null => attribute.firstNamedChild?.text ?? null

export const isActionAttribute = (attribute: SyntaxNode, name: string): boolean =>
  ACTION_ATTRIBUTES.has(name) && attribute.lastNamedChild?.type === EXPRESSION_VALUE_TYPE

export const methodNameOf = (call: SyntaxNode): string | null => {
  const callee = call.childForFieldName("function")
  return callee?.type === MEMBER_TYPE ? (callee.childForFieldName("property")?.text ?? null) : null
}

export const listArguments = (call: SyntaxNode): SyntaxNode[] => call.childForFieldName("arguments")?.namedChildren ?? []

const listOwnReturns = (body: SyntaxNode): SyntaxNode[] =>
  collectFromNode(body, (node) => {
    if (FUNCTION_TYPES.has(node.type)) return { found: [], shouldDescend: false }
    return { found: node.type === RETURN_TYPE ? [node] : [], shouldDescend: true }
  })

export const returnedValueOf = (statement: SyntaxNode): SyntaxNode | null => statement.firstNamedChild

const isChoosing = (operation: SyntaxNode): boolean => CHOOSING_OPERATORS.has(operation.childForFieldName("operator")?.type ?? "")

const hasMarkupIn = (node: SyntaxNode, fields: readonly string[]): boolean =>
  fields.some((field) => {
    const part = node.childForFieldName(field)
    return part !== null && isMarkup(part)
  })

export function returnsMarkup(callable: SyntaxNode): boolean {
  const body = callable.childForFieldName("body")
  if (body === null) return false
  if (body.type !== BODY_TYPE) return isMarkup(body)
  return listOwnReturns(body).some((statement) => {
    const value = returnedValueOf(statement)
    return value !== null && isMarkup(value)
  })
}

export function isMarkupLoop(call: SyntaxNode): boolean {
  const method = methodNameOf(call)
  if (call.type !== CALL_TYPE || method === null || !COLLECTION_METHODS.has(method)) return false
  return listArguments(call).some((argument) => FUNCTION_TYPES.has(argument.type) && returnsMarkup(argument))
}

export function isMarkup(node: SyntaxNode): boolean {
  const value = unwrapped(node)
  if (isElement(value)) return true
  if (value.type === CONDITION_TYPE) return hasMarkupIn(value, ["consequence", "alternative"])
  if (value.type === OPERATION_TYPE) return isChoosing(value) && hasMarkupIn(value, ["left", "right"])
  return isMarkupLoop(value)
}

export const isMarkupCondition = (node: SyntaxNode): boolean =>
  (node.type === CONDITION_TYPE || node.type === OPERATION_TYPE) && isMarkup(node)

export const isArrowBody = (node: SyntaxNode): boolean =>
  node.parent?.type === ARROW_TYPE && isFieldOf(node, "body") && node.type !== BODY_TYPE

const isRenderMethod = (member: SyntaxNode): boolean =>
  member.type === METHOD_TYPE && member.childForFieldName("name")?.text === RENDER_METHOD && returnsMarkup(member)

export const isClassComponent = (declared: SyntaxNode): boolean =>
  declared.namedChildren.some((child) => child.type === HERITAGE_TYPE)
  && (declared.childForFieldName("body")?.namedChildren ?? []).some(isRenderMethod)
