import type { SyntaxNode } from "@/ast-graph/parser"

const FUNCTION_TYPES = ["function_definition", "lambda"]
const CLASS_TYPE = "class_definition"
const LASTING_SCOPE_TYPES = [...FUNCTION_TYPES, CLASS_TYPE]
const SCOPE_TYPES = [...LASTING_SCOPE_TYPES, "list_comprehension", "set_comprehension", "dictionary_comprehension", "generator_expression"]
const TYPE_PARAMETER_OWNER_TYPES = ["function_definition", CLASS_TYPE, "type_alias_statement"]

const enclosing = (node: SyntaxNode, types: readonly string[]): SyntaxNode => node.closest([...types]) ?? node.tree.rootNode

export const scopeOwnerOf = (node: SyntaxNode): SyntaxNode => enclosing(node, SCOPE_TYPES)

export const lastingScopeOwnerOf = (node: SyntaxNode): SyntaxNode => enclosing(node, LASTING_SCOPE_TYPES)

export const functionAround = (node: SyntaxNode): SyntaxNode => enclosing(node, FUNCTION_TYPES)

export const typeParameterOwnerOf = (node: SyntaxNode): SyntaxNode => enclosing(node, TYPE_PARAMETER_OWNER_TYPES)

export const isFunction = (owner: SyntaxNode): boolean => FUNCTION_TYPES.includes(owner.type)

export const isClass = (owner: SyntaxNode): boolean => owner.type === CLASS_TYPE

export const scopeOf = (owner: SyntaxNode): SyntaxNode => (isFunction(owner) ? (owner.childForFieldName("body") ?? owner) : owner)
