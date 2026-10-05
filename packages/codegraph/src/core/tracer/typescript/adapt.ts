import { childAt, isNode, renamed, without, type Node } from "./node"

const FUNCTION_TYPES = new Set([
  "TSFunctionType",
  "TSConstructorType",
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSMethodSignature",
])

const DECORATED = new Set([
  "Identifier",
  "ObjectPattern",
  "ArrayPattern",
  "RestElement",
  "AssignmentPattern",
  "TSParameterProperty",
  "ClassDeclaration",
  "ClassExpression",
  "MethodDefinition",
  "PropertyDefinition",
  "AccessorProperty",
  "TSAbstractMethodDefinition",
  "TSAbstractPropertyDefinition",
  "TSAbstractAccessorProperty",
])

type Shape = (node: Node, source: string) => Node

const identifierAt = (source: string, name: string, from: number): Node => {
  const start = source.indexOf(name, from)
  return { type: "Identifier", name, start, end: start + name.length, range: [start, start + name.length], decorators: [] }
}

const retyped = (value: unknown, type: string): unknown => (isNode(value) ? { ...value, type } : value)

const heritage = (node: Node, field: string, type: string): Node => {
  const listed = node[field]
  return { ...node, [field]: Array.isArray(listed) ? listed.map((one: unknown) => retyped(one, type)) : [] }
}

const withDecorators: Shape = (node) => (DECORATED.has(node.type) ? { ...node, decorators: node.decorators ?? [] } : node)

const parameterProperty: Shape = (node) => {
  const parameter = childAt(node, "parameter")
  const moved = parameter?.decorators
  if (parameter === null || !Array.isArray(moved) || moved.length === 0) return node
  return { ...node, decorators: moved, parameter: { ...parameter, decorators: [] } }
}

const classShape: Shape = (node) => renamed(heritage(node, "implements", "TSClassImplements"), "superTypeParameters", "superTypeArguments")

const interfaceShape: Shape = (node) => heritage(node, "extends", "TSInterfaceHeritage")

const typeParameter: Shape = (node, source) =>
  typeof node.name === "string" ? { ...node, name: identifierAt(source, node.name, node.start) } : node

const mappedType: Shape = (node, source) => {
  const parameter = childAt(node, "typeParameter")
  if (parameter === null) return node
  const key = typeof parameter.name === "string" ? identifierAt(source, parameter.name, parameter.start) : parameter.name
  return { ...without(node, "typeParameter"), key, constraint: parameter.constraint }
}

const emptyBody = (value: Node | null): Node | null =>
  value?.type === "TSDeclareMethod" ? { ...value, type: "TSEmptyBodyFunctionExpression", body: null } : value

const withMovedTypeParameters = (node: Node, value: Node | null): Node => {
  if (value === null) return node
  if (node.type !== "MethodDefinition" || node.typeParameters === undefined) return node.value === value ? node : { ...node, value }
  return { ...without(node, "typeParameters"), value: { ...value, typeParameters: node.typeParameters } }
}

const abstractType = (node: Node): string => {
  if (node.accessor === true) return node.abstract === true ? "TSAbstractAccessorProperty" : "AccessorProperty"
  if (node.abstract !== true) return node.type
  return node.type === "MethodDefinition" ? "TSAbstractMethodDefinition" : "TSAbstractPropertyDefinition"
}

const member: Shape = (node) => {
  const moved = withMovedTypeParameters(node, emptyBody(childAt(node, "value")))
  const type = abstractType(moved)
  return moved.accessor === true ? { ...without(moved, "accessor"), type } : { ...moved, type }
}

const enumDeclaration: Shape = (node) =>
  node.body === undefined
    ? { ...without(node, "members"), body: { type: "TSEnumBody", members: node.members, start: node.start, end: node.end, range: [node.start, node.end] } }
    : node

const SHAPE_BY_TYPE: ReadonlyMap<string, Shape> = new Map([
  ["TSParameterProperty", parameterProperty],
  ["ClassDeclaration", classShape],
  ["ClassExpression", classShape],
  ["TSInterfaceDeclaration", interfaceShape],
  ["TSTypeParameter", typeParameter],
  ["TSMappedType", mappedType],
  ["MethodDefinition", member],
  ["PropertyDefinition", member],
  ["TSEnumDeclaration", enumDeclaration],
])

const functionType: Shape = (node) =>
  FUNCTION_TYPES.has(node.type) ? renamed(renamed(node, "parameters", "params"), "typeAnnotation", "returnType") : node

const typeArguments: Shape = (node) =>
  isNode(node.typeParameters) && node.typeParameters.type === "TSTypeParameterInstantiation"
    ? renamed(node, "typeParameters", "typeArguments")
    : node

const shaped: Shape = (node, source) => {
  const decorated = withDecorators(node, source)
  const byType = SHAPE_BY_TYPE.get(decorated.type)?.(decorated, source) ?? decorated
  return typeArguments(functionType(byType, source), source)
}

const adaptedValue = (key: string, value: unknown, source: string): unknown => {
  if (key === "loc" || key === "range") return value
  if (Array.isArray(value)) return value.map((one: unknown) => (isNode(one) ? adapt(one, source) : one))
  return isNode(value) ? adapt(value, source) : value
}

export function adapt(node: Node, source: string): Node {
  const local = shaped(node, source)
  return {
    ...Object.fromEntries(Object.entries(local).map(([key, value]) => [key, adaptedValue(key, value, source)])),
    type: local.type,
    start: local.start,
    end: local.end,
  }
}
