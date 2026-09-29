/**
 * Gives an acorn-typescript tree the shapes `@typescript-eslint/scope-manager`
 * reads.
 *
 * The scope manager is written against typescript-estree v8. acorn-typescript
 * leaves out fields typescript-estree always sets, and names some TypeScript
 * nodes the way typescript-estree did before v6. The scope manager then
 * crashes (`param.decorators.forEach`) or skips a subtree. This pass changes
 * the tree in place, once, after the parse:
 * - `decorators: []` on parameters, classes and class members, `implements: []`
 *   on classes, `extends: []` on interfaces, where acorn-typescript leaves
 *   them out;
 * - function-like type nodes keep their parameters in `params` and their
 *   return type in `returnType`, not `parameters` and `typeAnnotation`;
 * - type arguments are `typeArguments` (`superTypeArguments` on a class), not
 *   `typeParameters`;
 * - a type parameter's name is an `Identifier`, not a string;
 * - heritage items are `TSClassImplements` / `TSInterfaceHeritage`, not
 *   `TSExpressionWithTypeArguments`;
 * - a mapped type has `key` and `constraint`, not a `typeParameter`;
 * - an enum keeps its members in `body: TSEnumBody`;
 * - an `accessor` field is an `AccessorProperty`, an abstract member a
 *   `TSAbstract…` node, and a method without a body (an overload, an abstract
 *   method) has a `TSEmptyBodyFunctionExpression` as its value;
 * - a method's type parameters sit on its function, not on the method;
 * - a constructor parameter property holds its own decorators, not its
 *   inner parameter.
 *
 * One shape is kept on purpose: acorn-typescript reads `namespace A.B {}` as
 * `A` holding `B`, so `A` is declared; typescript-estree v8 writes one
 * declaration named `A.B`, which declares nothing.
 *
 * `adapt.test.ts` checks the result against typescript-estree's own tree:
 * every reference must resolve the same.
 */
import type { Node } from "./estree"

/** Function-like type nodes, which keep `parameters` and `typeAnnotation`. */
const FUNCTION_TYPES = new Set([
  "TSFunctionType",
  "TSConstructorType",
  "TSCallSignatureDeclaration",
  "TSConstructSignatureDeclaration",
  "TSMethodSignature",
])

/** Nodes typescript-estree always gives a `decorators` array. */
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

const isNode = (value: unknown): value is Node =>
  typeof value === "object" && value !== null && typeof (value as { type?: unknown }).type === "string"

/** Moves a field to a new key, when it is there. */
function rename(node: Node, from: string, to: string): void {
  if (node[from] === undefined) return
  node[to] = node[from]
  delete node[from]
}

/** Changes the tree of `source` in place; see the module comment. */
export function adapt(program: Node, source: string): void {
  // A name acorn-typescript gives as a string, as the `Identifier` it spans.
  const identifierAt = (name: string, from: number): Node => {
    const start = source.indexOf(name, from)
    return { type: "Identifier", name, start, end: start + name.length, range: [start, start + name.length], decorators: [] }
  }

  const visit = (node: Node): void => {
    if (DECORATED.has(node.type)) node.decorators ??= []
    switch (node.type) {
      case "TSParameterProperty": {
        const parameter = node.parameter as Node
        const moved = (parameter.decorators as Node[] | undefined) ?? []
        if (moved.length > 0) {
          node.decorators = moved
          parameter.decorators = []
        }
        break
      }
      case "ClassDeclaration":
      case "ClassExpression":
        node.implements ??= []
        for (const one of node.implements as Node[]) one.type = "TSClassImplements"
        rename(node, "superTypeParameters", "superTypeArguments")
        break
      case "TSInterfaceDeclaration":
        node.extends ??= []
        for (const one of node.extends as Node[]) one.type = "TSInterfaceHeritage"
        break
      case "TSTypeParameter":
        if (typeof node.name === "string") node.name = identifierAt(node.name, node.start)
        break
      case "TSMappedType": {
        const parameter = node.typeParameter as Node | undefined
        if (parameter === undefined) break
        node.key = typeof parameter.name === "string" ? identifierAt(parameter.name, parameter.start) : parameter.name
        node.constraint = parameter.constraint
        delete node.typeParameter
        break
      }
      case "MethodDefinition":
      case "PropertyDefinition": {
        const value = node.value as Node | null
        if (value?.type === "TSDeclareMethod") {
          value.type = "TSEmptyBodyFunctionExpression"
          value.body = null
        }
        if (node.type === "MethodDefinition" && value !== null && node.typeParameters !== undefined) {
          value.typeParameters = node.typeParameters
          delete node.typeParameters
        }
        if (node.accessor === true) {
          node.type = node.abstract === true ? "TSAbstractAccessorProperty" : "AccessorProperty"
          delete node.accessor
        } else if (node.abstract === true) {
          node.type = node.type === "MethodDefinition" ? "TSAbstractMethodDefinition" : "TSAbstractPropertyDefinition"
        }
        break
      }
      case "TSEnumDeclaration":
        if (node.body === undefined) {
          node.body = { type: "TSEnumBody", members: node.members, start: node.start, end: node.end, range: [node.start, node.end] }
          delete node.members
        }
        break
    }
    if (FUNCTION_TYPES.has(node.type)) {
      rename(node, "parameters", "params")
      rename(node, "typeAnnotation", "returnType")
    }
    if (isNode(node.typeParameters) && node.typeParameters.type === "TSTypeParameterInstantiation") {
      rename(node, "typeParameters", "typeArguments")
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "range") continue
      if (Array.isArray(value)) {
        for (const one of value) if (isNode(one)) visit(one)
      } else if (isNode(value)) {
        visit(value)
      }
    }
  }
  visit(program)
}
