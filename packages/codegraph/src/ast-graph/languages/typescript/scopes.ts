import type { SyntaxNode } from "@/ast-graph/parser"

const FUNCTION_TYPES = [
  "function_declaration",
  "generator_function_declaration",
  "function_expression",
  "generator_function",
  "arrow_function",
  "method_definition",
  "function_signature",
  "method_signature",
  "abstract_method_signature",
  "call_signature",
  "construct_signature",
  "function_type",
  "constructor_type",
]
const FUNCTION_SCOPE_TYPES = [...FUNCTION_TYPES, "program", "class_static_block", "internal_module", "module"]
const BLOCK_SCOPE_TYPES = [...FUNCTION_TYPES, "program", "statement_block", "for_statement", "for_in_statement", "switch_body", "catch_clause"]
const HOISTED_DECLARATION_TYPE = "variable_declaration"

const enclosing = (node: SyntaxNode, types: readonly string[]): SyntaxNode => node.closest([...types]) ?? node.tree.rootNode

export const blockScopeOf = (node: SyntaxNode): SyntaxNode => enclosing(node, BLOCK_SCOPE_TYPES)

export const functionScopeOf = (node: SyntaxNode): SyntaxNode => enclosing(node, FUNCTION_SCOPE_TYPES)

export const declaratorScopeOf = (declarator: SyntaxNode): SyntaxNode =>
  declarator.parent?.type === HOISTED_DECLARATION_TYPE ? functionScopeOf(declarator) : blockScopeOf(declarator)
