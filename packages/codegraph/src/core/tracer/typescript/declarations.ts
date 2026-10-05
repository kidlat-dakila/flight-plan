import type { Range } from "@/core/types"
import { rangeBetween, rangeOf, skipTrivia, type Parsed } from "./estree"
import { childAt, childrenAt, isNode, textAt, type Node } from "./node"

export interface LocalDecl {
  name: string
  definedAt: Range
  enclosingRange: Range
}

const isFunctionValue = (node: unknown): node is Node =>
  isNode(node) && (node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression") && node.generator !== true

const DATA_METHODS = new Set([
  "map", "filter", "reduce", "reduceRight", "find", "findLast", "findIndex", "findLastIndex",
  "some", "every", "sort", "toSorted", "flatMap", "forEach", "then", "catch", "finally",
])

const isDataMethodCall = (call: Node): boolean => {
  const callee = childAt(call, "callee")
  if (callee?.type !== "MemberExpression" || callee.computed === true) return false
  const property = childAt(callee, "property")
  const name = property === null ? null : textAt(property, "name")
  return name !== null && DATA_METHODS.has(name)
}

const functionArguments = (call: Node): Node[] => (isDataMethodCall(call) ? [] : childrenAt(call, "arguments").filter(isFunctionValue))

const isBuiltFunction = (node: unknown): boolean => {
  if (!isNode(node)) return false
  if (node.type === "CallExpression") return functionArguments(node).length > 0 || isBuiltFunction(node.callee)
  return node.type === "MemberExpression" && isBuiltFunction(node.object)
}

const unwrap = (node: Node): Node | null =>
  node.type === "ExportNamedDeclaration" || node.type === "ExportDefaultDeclaration" ? childAt(node, "declaration") : node

function bindingName(parsed: Parsed, id: Node): { name: string, at: Range } {
  const end = id.type === "Identifier" ? id.start + (textAt(id, "name") ?? "").length : (childAt(id, "typeAnnotation")?.start ?? id.end)
  const name = parsed.source.slice(id.start, end).trimEnd()
  return { name, at: rangeBetween(parsed, id.start, id.start + name.length) }
}

function memberName(parsed: Parsed, member: Node): { name: string, at: Range } {
  const key = childAt(member, "key") ?? member
  if (member.computed !== true) return { name: parsed.source.slice(key.start, key.end), at: rangeOf(parsed, key) }
  const open = parsed.source.lastIndexOf("[", key.start)
  const close = parsed.source.indexOf("]", key.end) + 1
  return { name: parsed.source.slice(open, close), at: rangeBetween(parsed, open, close) }
}

function memberStart(parsed: Parsed, member: Node): number {
  const decorators = childrenAt(member, "decorators")
  return decorators.length === 0 ? member.start : skipTrivia(parsed.source, decorators[decorators.length - 1].end)
}

export function declarationsIn(parsed: Parsed): LocalDecl[] {
  return childrenAt(parsed.program, "body").flatMap((statement) => {
    const decl = unwrap(statement)
    return decl === null ? [] : collect(parsed, decl, "")
  })
}

const within = (owner: string, name: string): string => (owner === "" ? name : `${owner}.${name}`)

function nestedInBuilt(parsed: Parsed, owner: string, at: Node | null): LocalDecl[] {
  if (at === null) return []
  if (at.type === "CallExpression") {
    return [
      ...functionArguments(at).flatMap((argument) => nested(parsed, owner, argument)),
      ...nestedInBuilt(parsed, owner, childAt(at, "callee")),
    ]
  }
  return at.type === "MemberExpression" ? nestedInBuilt(parsed, owner, childAt(at, "object")) : []
}

function nested(parsed: Parsed, owner: string, fn: Node): LocalDecl[] {
  if (isBuiltFunction(fn)) return nestedInBuilt(parsed, owner, fn)
  const body = childAt(fn, "body")
  if (body?.type !== "BlockStatement") return []
  return childrenAt(body, "body")
    .filter((statement) => statement.type === "FunctionDeclaration" || statement.type === "VariableDeclaration")
    .flatMap((statement) => collect(parsed, statement, owner))
}

function functionDeclaration(parsed: Parsed, decl: Node, owner: string): LocalDecl[] {
  const id = childAt(decl, "id")
  if (id === null) return []
  const { name, at } = bindingName(parsed, id)
  return [{ name: within(owner, name), definedAt: at, enclosingRange: rangeOf(parsed, decl) }, ...nested(parsed, within(owner, name), decl)]
}

function declarator(parsed: Parsed, one: Node, owner: string): LocalDecl[] {
  const value = childAt(one, "init")
  const id = childAt(one, "id")
  if (value === null || id === null) return []
  const isBuilt = id.type === "Identifier" && isBuiltFunction(value)
  if (!isFunctionValue(value) && !isBuilt) return []
  const { name, at } = bindingName(parsed, id)
  return [{ name: within(owner, name), definedAt: at, enclosingRange: rangeOf(parsed, value) }, ...nested(parsed, within(owner, name), value)]
}

function classDeclaration(parsed: Parsed, decl: Node, owner: string): LocalDecl[] {
  const id = childAt(decl, "id")
  const body = childAt(decl, "body")
  if (id === null || body === null || owner !== "") return []
  const className = textAt(id, "name") ?? ""
  return childrenAt(body, "body").flatMap((member) => memberOf(parsed, className, member))
}

function collect(parsed: Parsed, decl: Node, owner: string): LocalDecl[] {
  if (decl.declare === true) return []
  if (decl.type === "FunctionDeclaration") return functionDeclaration(parsed, decl, owner)
  if (decl.type === "VariableDeclaration") return childrenAt(decl, "declarations").flatMap((one) => declarator(parsed, one, owner))
  return decl.type === "ClassDeclaration" ? classDeclaration(parsed, decl, owner) : []
}

function memberOf(parsed: Parsed, className: string, member: Node): LocalDecl[] {
  const named = (name: string): string => (className === "" ? name : `${className}.${name}`)
  const value = childAt(member, "value")
  if (member.type === "MethodDefinition" && value?.type === "FunctionExpression") {
    const { name, at } = memberName(parsed, member)
    return [
      { name: named(name), definedAt: at, enclosingRange: rangeBetween(parsed, memberStart(parsed, member), member.end) },
      ...nested(parsed, named(name), value),
    ]
  }
  const isField = member.type === "PropertyDefinition" || member.type === "AccessorProperty"
  if (!isField || parsed.grammar !== "typescript" || !isFunctionValue(value)) return []
  const { name, at } = memberName(parsed, member)
  return [{ name: named(name), definedAt: at, enclosingRange: rangeOf(parsed, value) }, ...nested(parsed, named(name), value)]
}
