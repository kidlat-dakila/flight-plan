import { nestEncapsulations, type FoundEncapsulation } from "@/ast-graph/languages/nest-encapsulations"
import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import { nodesMatching, patternOfTypes } from "@/ast-graph/query-nodes"
import { rangeOf } from "@/ast-graph/source-range"
import type { EncapsulationKind } from "@/ast-graph/types"
import { PYTHON_GRAMMAR } from "./bindings"
import { targetNamesIn } from "./patterns"
import { isClass, lastingScopeOwnerOf } from "./scopes"

const FUNCTION_TYPE = "function_definition"
const CLASS_TYPE = "class_definition"
const ASSIGNMENT_TYPE = "assignment"
const STATEMENT_TYPE = "expression_statement"
const DECORATED_TYPE = "decorated_definition"
const SINGLE_NAME_TYPE = "identifier"
const FUNCTION_VALUE_TYPE = "lambda"
const WRAPPER_TYPES: ReadonlySet<string> = new Set([DECORATED_TYPE, STATEMENT_TYPE])
const NESTED_PATTERN = patternOfTypes([FUNCTION_TYPE, CLASS_TYPE, ASSIGNMENT_TYPE])

const wrapperOf = (node: SyntaxNode): SyntaxNode => (node.parent !== null && WRAPPER_TYPES.has(node.parent.type) ? node.parent : node)

const functionKindOf = (node: SyntaxNode): EncapsulationKind => (isClass(lastingScopeOwnerOf(node)) ? "method" : "function")

const foundAs = (node: SyntaxNode, name: SyntaxNode | null, kind: EncapsulationKind): FoundEncapsulation[] =>
  name === null ? [] : [{ node, name: name.text, kind, range: rangeOf(wrapperOf(node)) }]

const isFunctionAssignment = (assignment: SyntaxNode): boolean =>
  assignment.childForFieldName("left")?.type === SINGLE_NAME_TYPE && assignment.childForFieldName("right")?.type === FUNCTION_VALUE_TYPE

const readNested = (node: SyntaxNode): FoundEncapsulation[] => {
  if (node.type === FUNCTION_TYPE) return foundAs(node, node.childForFieldName("name"), functionKindOf(node))
  if (node.type === CLASS_TYPE) return foundAs(node, node.childForFieldName("name"), "class")
  return isFunctionAssignment(node) ? foundAs(node, node.childForFieldName("left"), functionKindOf(node)) : []
}

const readRootAssignment = (assignment: SyntaxNode): FoundEncapsulation[] => {
  const target = assignment.childForFieldName("left")
  const value = assignment.childForFieldName("right")
  const chained = value?.type === ASSIGNMENT_TYPE ? readRootAssignment(value) : []
  if (target === null) return chained
  const named = isFunctionAssignment(assignment) ? readNested(assignment) : targetNamesIn(target).flatMap((name) => foundAs(assignment, name, "variable"))
  return [...named, ...chained]
}

const readRootStatement = (statement: SyntaxNode): FoundEncapsulation[] => {
  if (statement.type === DECORATED_TYPE) return statement.namedChildren.flatMap(readNested)
  if (statement.type !== STATEMENT_TYPE) return readNested(statement)
  return statement.namedChildren.filter((child) => child.type === ASSIGNMENT_TYPE).flatMap(readRootAssignment)
}

export const readRootEncapsulations = (tree: SyntaxTree) =>
  nestEncapsulations(tree.rootNode.namedChildren.flatMap(readRootStatement), nodesMatching(PYTHON_GRAMMAR, tree, NESTED_PATTERN).flatMap(readNested))
