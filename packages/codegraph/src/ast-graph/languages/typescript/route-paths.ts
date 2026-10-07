import type { SyntaxNode } from "@/ast-graph/parser"
import { isQuoted, unquoted } from "./syntax"

const PAIR_TYPE = "pair"
const OBJECT_TYPE = "object"
const ARRAY_TYPE = "array"
const CALL_TYPE = "call_expression"
const ARGUMENTS_TYPE = "arguments"
const PATH_KEY = "path"
const INDEX_KEY = "index"
const CHILDREN_KEY = "children"
const PATH_SEPARATOR = "/"
const INDEX_SEGMENT = ""

const pairNamed = (object: SyntaxNode, key: string): SyntaxNode | null =>
  object.namedChildren.find((child) => child.type === PAIR_TYPE && child.childForFieldName("key")?.text === key) ?? null

const literalOf = (node: SyntaxNode | null): string | null => (node !== null && isQuoted(node) ? unquoted(node.text) : null)

const pathOfRouteCall = (object: SyntaxNode): string | null => {
  const routeCall = object.parent?.type === ARGUMENTS_TYPE ? object.parent.parent?.childForFieldName("function") ?? null : null
  if (routeCall?.type !== CALL_TYPE) return null
  return literalOf(routeCall.childForFieldName("arguments")?.firstNamedChild ?? null)
}

const ownSegmentOf = (object: SyntaxNode): string | null => {
  const path = pairNamed(object, PATH_KEY)
  if (path !== null) return literalOf(path.childForFieldName("value"))
  return pairNamed(object, INDEX_KEY) === null ? pathOfRouteCall(object) : INDEX_SEGMENT
}

const parentRouteOf = (object: SyntaxNode): SyntaxNode | null => {
  const children = object.parent?.type === ARRAY_TYPE ? object.parent.parent : null
  const isChildList = children?.type === PAIR_TYPE && children.childForFieldName("key")?.text === CHILDREN_KEY
  return isChildList && children.parent?.type === OBJECT_TYPE ? children.parent : null
}

const segmentsOf = (object: SyntaxNode): string[] | null => {
  const own = ownSegmentOf(object)
  if (own === null) return null
  const parent = parentRouteOf(object)
  return [...(parent === null ? [] : segmentsOf(parent) ?? []), own]
}

export const joinRoutePath = (segments: readonly string[]): string =>
  `${PATH_SEPARATOR}${segments.flatMap((segment) => segment.split(PATH_SEPARATOR)).filter((part) => part.length > 0).join(PATH_SEPARATOR)}`

export const routePathOf = (routeObject: SyntaxNode): string | null => {
  const segments = routeObject.type === OBJECT_TYPE ? segmentsOf(routeObject) : null
  return segments === null ? null : joinRoutePath(segments)
}
