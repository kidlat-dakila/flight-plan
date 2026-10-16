import { bindingNamesIn } from "@/ast-graph/languages/typescript/patterns"
import type { SyntaxNode } from "@/ast-graph/parser"
import { listParameters, patternOf } from "./arguments"
import { FUNCTION_TYPES } from "./markup"

const TARGET_FIELD_BY_TYPE: ReadonlyMap<string, string> = new Map([
  ["assignment_expression", "left"],
  ["augmented_assignment_expression", "left"],
  ["update_expression", "argument"],
])
const MEMBER_TYPES: ReadonlySet<string> = new Set(["member_expression", "subscript_expression"])
const NAME_TYPE = "identifier"
const OBJECT_FIELD = "object"

const rootObjectOf = (target: SyntaxNode): SyntaxNode => {
  const object = MEMBER_TYPES.has(target.type) ? target.childForFieldName(OBJECT_FIELD) : null
  return object === null ? target : rootObjectOf(object)
}

const enclosingFunctionOf = (node: SyntaxNode): SyntaxNode | null => {
  const { parent } = node
  if (parent === null) return null
  return FUNCTION_TYPES.has(parent.type) ? parent : enclosingFunctionOf(parent)
}

const parameterNamesOf = (callable: SyntaxNode): ReadonlySet<string> =>
  new Set(listParameters(callable).flatMap((parameter) => {
    const pattern = patternOf(parameter)
    return pattern === null ? [] : bindingNamesIn(pattern).map((name) => name.text)
  }))

export const parameterMemberWrittenIn = (writing: SyntaxNode): SyntaxNode | null => {
  const field = TARGET_FIELD_BY_TYPE.get(writing.type)
  const target = field === undefined ? null : writing.childForFieldName(field)
  if (target === null || !MEMBER_TYPES.has(target.type)) return null
  const root = rootObjectOf(target)
  const callable = enclosingFunctionOf(writing)
  return root.type === NAME_TYPE && callable !== null && parameterNamesOf(callable).has(root.text) ? target : null
}
