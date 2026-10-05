import { queryCaptures, type GrammarId, type SyntaxNode, type SyntaxTree } from "./parser"

export const patternOfTypes = (types: readonly string[]): string => `[${types.map((type) => `(${type})`).join(" ")}] @node`

export const nodesMatching = (grammar: GrammarId, tree: SyntaxTree, pattern: string): SyntaxNode[] =>
  queryCaptures(grammar, tree.rootNode, pattern).map((capture) => capture.node)
