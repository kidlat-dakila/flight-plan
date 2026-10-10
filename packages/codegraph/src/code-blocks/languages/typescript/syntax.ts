import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import type { Position as SyntaxPosition, SourceRange as SyntaxRange } from "@/ast-graph/types"
import { positionKey, rangeOfNode } from "@/code-blocks/source-range"
import type { CodeBlockType, Position, SourceRange } from "@/code-blocks/types"

const FIRST_LINE = 1
const HOOK_NAME_PATTERN = /^use[A-Z]/

const pointOf = ({ line, column }: SyntaxPosition): { row: number, column: number } => ({ row: line - FIRST_LINE, column })

export const nodeAtRange = (tree: SyntaxTree, { start, end }: SyntaxRange): SyntaxNode =>
  tree.rootNode.namedDescendantForPosition(pointOf(start), pointOf(end))

export const startOf = (node: SyntaxNode): Position => rangeOfNode(node).start

export const callableTypeOf = (name: string | null): CodeBlockType => (name !== null && HOOK_NAME_PATTERN.test(name) ? "hook" : "function")

export const blockIdOf = (filePath: string, type: CodeBlockType, { start, end }: SourceRange, takenIds: readonly string[]): string => {
  const id = `${filePath}#${type}@${positionKey(start)}`
  return takenIds.includes(id) ? `${id}-${positionKey(end)}` : id
}

export const named = (name: string | null): { name?: string } => (name === null ? {} : { name })
