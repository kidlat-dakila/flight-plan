import { nestEncapsulations, type FoundEncapsulation } from "@/ast-graph/languages/nest-encapsulations"
import type { GrammarId, SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { rangeOf } from "@/ast-graph/source-range"
import type { Encapsulation, EncapsulationKind, SourceRange } from "@/ast-graph/types"
import { isRequireDeclarator } from "./imports"
import { bindingNamesIn } from "./patterns"
import { isClassValue, isFunctionValue, leftmostIdentifierOf, textOfName } from "./syntax"

const DEFAULT_EXPORT = "default"
const EXPORT_TYPE = "export_statement"
const AMBIENT_TYPE = "ambient_declaration"
const STATEMENT_TYPE = "expression_statement"
const NAMESPACE_TYPE = "internal_module"
const DECLARATOR_TYPE = "variable_declarator"
const METHOD_TYPE = "method_definition"
const DECORATOR_TYPE = "decorator"
const SINGLE_NAME_TYPE = "identifier"
const FUNCTION_TYPES: ReadonlySet<string> = new Set(["function_declaration", "generator_function_declaration"])
const CLASS_TYPES: ReadonlySet<string> = new Set(["class_declaration", "abstract_class_declaration"])
const MEMBER_NAME_FIELDS: ReadonlyMap<string, string> = new Map([
  ["public_field_definition", "name"],
  ["pair", "key"],
])
const VALUE_DECLARATION_TYPES: ReadonlySet<string> = new Set(["enum_declaration", "internal_module", "module"])
const VARIABLE_DECLARATION_TYPES: ReadonlySet<string> = new Set(["lexical_declaration", "variable_declaration"])
const WRAPPER_TYPES: ReadonlySet<string> = new Set([EXPORT_TYPE, STATEMENT_TYPE])
const OBJECT_TYPE = "object"
const HANDED_OVER_TYPES: ReadonlySet<string> = new Set(["arguments", "jsx_expression"])
const OBJECT_NESTING_TYPES: ReadonlySet<string> = new Set([
  OBJECT_TYPE,
  "pair",
  "parenthesized_expression",
  "as_expression",
  "satisfies_expression",
])

const NESTED_PATTERN = patternOfTypes([...FUNCTION_TYPES, ...CLASS_TYPES, METHOD_TYPE, DECLARATOR_TYPE, ...MEMBER_NAME_FIELDS.keys()])

interface Named {
  readonly name: string
  readonly kind: EncapsulationKind
}

interface Found {
  readonly node: SyntaxNode
  readonly named: Named
}

const declaratorsOf = (declaration: SyntaxNode): SyntaxNode[] =>
  declaration.namedChildren.filter((child) => child.type === DECLARATOR_TYPE)

const wrapperOf = (node: SyntaxNode): SyntaxNode => (node.parent !== null && WRAPPER_TYPES.has(node.parent.type) ? node.parent : node)

const firstDecoratorOf = (member: SyntaxNode): SyntaxNode => {
  const previous = member.previousNamedSibling
  return previous?.type === DECORATOR_TYPE ? firstDecoratorOf(previous) : member
}

const rangeOfEncapsulation = (node: SyntaxNode): SourceRange => {
  if (node.type === METHOD_TYPE) return { start: rangeOf(firstDecoratorOf(node)).start, end: rangeOf(node).end }
  if (node.type !== DECLARATOR_TYPE || node.parent === null) return rangeOf(wrapperOf(node))
  return declaratorsOf(node.parent).length > 1 ? rangeOf(node) : rangeOf(wrapperOf(node.parent))
}

const kindOfValue = (value: SyntaxNode | null, functionKind: EncapsulationKind): EncapsulationKind | null => {
  if (isFunctionValue(value)) return functionKind
  return isClassValue(value) ? "class" : null
}

const namedBy = (node: SyntaxNode, field: string, kind: EncapsulationKind | null): Named | null => {
  const name = node.childForFieldName(field)
  return name === null || kind === null ? null : { name: textOfName(leftmostIdentifierOf(name)), kind }
}

const nameOfMember = (node: SyntaxNode): Named | null => {
  const field = MEMBER_NAME_FIELDS.get(node.type)
  return field === undefined ? null : namedBy(node, field, kindOfValue(node.childForFieldName("value"), "method"))
}

const nameOfDeclarator = (declarator: SyntaxNode): Named | null => {
  if (declarator.childForFieldName("name")?.type !== SINGLE_NAME_TYPE) return null
  return namedBy(declarator, "name", kindOfValue(declarator.childForFieldName("value"), "function"))
}

const holderOf = (node: SyntaxNode): SyntaxNode | null =>
  node.parent !== null && OBJECT_NESTING_TYPES.has(node.parent.type) ? holderOf(node.parent) : node.parent

const isMemberOfPassedObject = (node: SyntaxNode): boolean => {
  const holder = node.parent?.type === OBJECT_TYPE ? holderOf(node) : null
  return holder !== null && HANDED_OVER_TYPES.has(holder.type)
}

const nameOf = (node: SyntaxNode): Named | null => {
  if (isMemberOfPassedObject(node)) return null
  if (FUNCTION_TYPES.has(node.type)) return namedBy(node, "name", "function")
  if (CLASS_TYPES.has(node.type)) return namedBy(node, "name", "class")
  if (node.type === METHOD_TYPE) return namedBy(node, "name", "method")
  return node.type === DECLARATOR_TYPE ? nameOfDeclarator(node) : nameOfMember(node)
}

const foundOf = ({ node, named }: Found): FoundEncapsulation => ({ node, ...named, range: rangeOfEncapsulation(node) })

const readRootDeclarator = (declarator: SyntaxNode): Found[] => {
  const pattern = declarator.childForFieldName("name")
  if (pattern === null || isRequireDeclarator(declarator)) return []
  const named = nameOfDeclarator(declarator)
  if (named !== null) return [{ node: declarator, named }]
  return bindingNamesIn(pattern).map((name) => ({ node: declarator, named: { name: name.text, kind: "variable" } }))
}

const readDefaultExport = (statement: SyntaxNode): Found[] => {
  const value = statement.childForFieldName("value")
  if (value === null || value.type === SINGLE_NAME_TYPE) return []
  return [{ node: value, named: { name: DEFAULT_EXPORT, kind: kindOfValue(value, "function") ?? "variable" } }]
}

const readRootDeclaration = (declaration: SyntaxNode): Found[] => {
  if (VARIABLE_DECLARATION_TYPES.has(declaration.type)) return declaratorsOf(declaration).flatMap(readRootDeclarator)
  const named = VALUE_DECLARATION_TYPES.has(declaration.type) ? namedBy(declaration, "name", "variable") : nameOf(declaration)
  return named === null ? [] : [{ node: declaration, named }]
}

const readRootStatement = (statement: SyntaxNode): Found[] => {
  if (statement.type === AMBIENT_TYPE) return []
  if (statement.type === STATEMENT_TYPE) return statement.namedChildren.filter((child) => child.type === NAMESPACE_TYPE).flatMap(readRootDeclaration)
  if (statement.type !== EXPORT_TYPE) return readRootDeclaration(statement)
  const exported = statement.childForFieldName("declaration")
  return exported === null ? readDefaultExport(statement) : readRootStatement(exported)
}

const readNested = (grammar: GrammarId, tree: SyntaxTree): Found[] =>
  nodesMatching(grammar, tree, NESTED_PATTERN).flatMap((node) => {
    const named = nameOf(node)
    return named === null ? [] : [{ node, named }]
  })

export const readRootEncapsulations = (grammar: GrammarId, tree: SyntaxTree): Encapsulation[] =>
  nestEncapsulations(tree.rootNode.namedChildren.flatMap(readRootStatement).map(foundOf), readNested(grammar, tree).map(foundOf))
