import type { SyntaxNode } from "@/ast-graph/parser"
import { collectFromNode } from "@/ast-graph/walk-tree"
import { isFieldOf } from "./syntax"

const BINDING_NAME_TYPES: ReadonlySet<string> = new Set(["identifier", "shorthand_property_identifier_pattern"])
const PATTERN_TYPES: ReadonlySet<string> = new Set([
  "object_pattern",
  "array_pattern",
  "pair_pattern",
  "assignment_pattern",
  "object_assignment_pattern",
  "rest_pattern",
])
const DEFAULTING_TYPES: ReadonlySet<string> = new Set(["assignment_pattern", "object_assignment_pattern"])
const DEFAULT_FIELD = "right"

const isDefault = (node: SyntaxNode): boolean =>
  node.parent !== null && DEFAULTING_TYPES.has(node.parent.type) && isFieldOf(node, DEFAULT_FIELD)

export const bindingNamesIn = (pattern: SyntaxNode): SyntaxNode[] =>
  collectFromNode(pattern, (node) => {
    if (isDefault(node)) return { found: [], shouldDescend: false }
    return { found: BINDING_NAME_TYPES.has(node.type) ? [node] : [], shouldDescend: PATTERN_TYPES.has(node.type) }
  })
