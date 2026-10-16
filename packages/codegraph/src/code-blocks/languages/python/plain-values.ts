import type { SyntaxNode } from "@/ast-graph/parser"

const RUNNING_TYPES: readonly string[] = [
  "call",
  "lambda",
  "list_comprehension",
  "dictionary_comprehension",
  "set_comprehension",
  "generator_expression",
  "await",
]
const RUNNING_TYPE_SET: ReadonlySet<string> = new Set(RUNNING_TYPES)

export const isPlainValue = (value: SyntaxNode | null): boolean =>
  value === null || (!RUNNING_TYPE_SET.has(value.type) && value.descendantsOfType([...RUNNING_TYPES]).length === 0)
