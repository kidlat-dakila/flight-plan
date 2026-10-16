import type { SyntaxNode } from "@/ast-graph/parser"

const RUNNING_TYPES: readonly string[] = [
  "call_expression",
  "arrow_function",
  "function_expression",
  "generator_function",
  "method_definition",
  "class",
  "jsx_element",
  "jsx_self_closing_element",
  "jsx_fragment",
]
const RUNNING_TYPE_SET: ReadonlySet<string> = new Set(RUNNING_TYPES)

export const isPlainValue = (value: SyntaxNode | null): boolean =>
  value === null || (!RUNNING_TYPE_SET.has(value.type) && value.descendantsOfType([...RUNNING_TYPES]).length === 0)
