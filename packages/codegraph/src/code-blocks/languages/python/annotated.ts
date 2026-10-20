import type { SyntaxNode } from "@/ast-graph/parser"

const SUBSCRIPT_TYPE = "subscript"
const GENERIC_TYPE = "generic_type"
const TYPE_PARAMETER_TYPE = "type_parameter"
const TYPE_TYPE = "type"
const MEMBER_TYPE = "attribute"
const CALL_TYPE = "call"
const NAMED_ARGUMENT_TYPE = "keyword_argument"
const ANNOTATED_NAME = "Annotated"

const nameOfSubscripted = (subscripted: SyntaxNode | null | undefined): string | null =>
  subscripted?.type === MEMBER_TYPE ? (subscripted.childForFieldName("attribute")?.text ?? null) : (subscripted?.text ?? null)

export const isAnnotated = (value: SyntaxNode | null): boolean =>
  value?.type === SUBSCRIPT_TYPE && nameOfSubscripted(value.childForFieldName("value")) === ANNOTATED_NAME

const isAnnotatedGeneric = (holder: SyntaxNode): boolean => holder.type === GENERIC_TYPE && nameOfSubscripted(holder.namedChildren[0]) === ANNOTATED_NAME

const unwrapped = (element: SyntaxNode): SyntaxNode => (element.type === TYPE_TYPE && element.namedChildCount === 1 ? element.namedChildren[0] : element)

const annotatedElementsOf = (holder: SyntaxNode | null): readonly SyntaxNode[] => {
  if (holder === null) return []
  if (isAnnotatedGeneric(holder)) return (holder.namedChildren.find((child) => child.type === TYPE_PARAMETER_TYPE)?.namedChildren ?? []).map(unwrapped)
  return isAnnotated(holder) ? holder.childrenForFieldName("subscript") : []
}

export const annotatedTypeOf = (holder: SyntaxNode): SyntaxNode | null => annotatedElementsOf(holder)[0] ?? null

const holderOfElement = (element: SyntaxNode): SyntaxNode | null => {
  const { parent } = element
  return parent?.type === TYPE_TYPE && parent.parent?.type === TYPE_PARAMETER_TYPE ? parent.parent.parent : parent
}

const hasNoPositionalArgument = (call: SyntaxNode): boolean =>
  (call.childForFieldName("arguments")?.namedChildren ?? []).every((argument) => argument.type === NAMED_ARGUMENT_TYPE)

const isFillable = (written: SyntaxNode): boolean => written.type === CALL_TYPE && hasNoPositionalArgument(written)

const firstFillableOf = (metadata: readonly SyntaxNode[]): SyntaxNode | null => metadata.find(isFillable) ?? null

export const callFilledByAnnotatedType = (annotatedType: SyntaxNode): SyntaxNode | null => {
  const elements = annotatedElementsOf(holderOfElement(annotatedType))
  return elements.length > 0 && elements[0].id === annotatedType.id ? firstFillableOf(elements.slice(1)) : null
}

export const annotatedTypeFilling = (call: SyntaxNode): SyntaxNode | null => {
  const elements = annotatedElementsOf(holderOfElement(call))
  return elements.length > 0 && firstFillableOf(elements.slice(1))?.id === call.id ? elements[0] : null
}
