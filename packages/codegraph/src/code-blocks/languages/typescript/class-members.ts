import type { SyntaxNode } from "@/ast-graph/parser"
import { FUNCTION_TYPES } from "./markup"

const RECEIVER_TYPE = "this"
const CLASS_BODY_TYPE = "class_body"
const ARROW_TYPE = "arrow_function"
const MEMBER_TYPE = "member_expression"
const ASSIGNMENT_TYPE = "assignment_expression"
const CLASS_MEMBER_TYPES: ReadonlySet<string> = new Set(["method_definition", "public_field_definition"])
const METHOD_TYPE = "method_definition"
const CONSTRUCTOR_NAME = "constructor"
const PARAMETER_TYPES: ReadonlySet<string> = new Set(["required_parameter", "optional_parameter"])
const PROPERTY_MARKS: ReadonlySet<string> = new Set(["accessibility_modifier", "readonly"])

export const classBodyBoundTo = (node: SyntaxNode): SyntaxNode | null => {
  const { parent } = node
  if (parent === null) return null
  if (parent.type === CLASS_BODY_TYPE) return parent
  return FUNCTION_TYPES.has(node.type) && node.type !== ARROW_TYPE && !CLASS_MEMBER_TYPES.has(node.type) ? null : classBodyBoundTo(parent)
}

const nameOfMember = (member: SyntaxNode): SyntaxNode | null => (CLASS_MEMBER_TYPES.has(member.type) ? member.childForFieldName("name") : null)

export const memberAssignedIn = (assignment: SyntaxNode): SyntaxNode | null => {
  const target = assignment.type === ASSIGNMENT_TYPE ? assignment.childForFieldName("left") : null
  const receiver = target?.type === MEMBER_TYPE ? target.childForFieldName("object") : null
  return receiver?.type === RECEIVER_TYPE ? (target?.childForFieldName("property") ?? null) : null
}

const listAssignedMembers = (classBody: SyntaxNode, takenNames: ReadonlySet<string>): SyntaxNode[] => {
  const assigned = classBody
    .descendantsOfType(ASSIGNMENT_TYPE)
    .filter((assignment) => classBodyBoundTo(assignment)?.id === classBody.id)
    .flatMap((assignment) => memberAssignedIn(assignment) ?? [])
    .filter((name) => !takenNames.has(name.text))
  const names = assigned.map((name) => name.text)
  return assigned.filter((_name, index) => names.indexOf(names[index]) === index)
}

const isConstructor = (member: SyntaxNode): boolean => member.type === METHOD_TYPE && member.childForFieldName("name")?.text === CONSTRUCTOR_NAME

export const isParameterProperty = (parameter: SyntaxNode): boolean => PARAMETER_TYPES.has(parameter.type) && parameter.children.some((child) => PROPERTY_MARKS.has(child.type))

const listParameterProperties = (classBody: SyntaxNode): SyntaxNode[] =>
  (classBody.namedChildren.find(isConstructor)?.childForFieldName("parameters")?.namedChildren ?? [])
    .filter(isParameterProperty)
    .flatMap((parameter) => parameter.childForFieldName("pattern") ?? [])

export const listMemberNames = (classBody: SyntaxNode): SyntaxNode[] => {
  const declared = [...classBody.namedChildren.flatMap((member) => nameOfMember(member) ?? []), ...listParameterProperties(classBody)]
  return [...declared, ...listAssignedMembers(classBody, new Set(declared.map((name) => name.text)))]
}

export const isFirstAssignmentOf = (name: SyntaxNode): boolean => {
  const classBody = classBodyBoundTo(name)
  return classBody !== null && listMemberNames(classBody).some((declared) => declared.id === name.id)
}
