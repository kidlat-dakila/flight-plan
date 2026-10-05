import type { SyntaxNode } from "@/ast-graph/parser"
import { collectFromNode } from "@/ast-graph/walk-tree"

const NAME_TYPE = "identifier"
const PATTERN_TYPES: ReadonlySet<string> = new Set(["pattern_list", "tuple_pattern", "list_pattern", "list_splat_pattern"])

export const targetNamesIn = (target: SyntaxNode): SyntaxNode[] =>
  collectFromNode(target, (node) => ({
    found: node.type === NAME_TYPE ? [node] : [],
    shouldDescend: PATTERN_TYPES.has(node.type),
  }))
