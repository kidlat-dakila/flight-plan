import type { SyntaxCursor, SyntaxNode } from "./parser"

export interface NodeReading<Found> {
  readonly found: readonly Found[]
  readonly shouldDescend: boolean
}

export type ReadNode<Found> = (node: SyntaxNode) => NodeReading<Found>

const START_DEPTH = 0

function* collectBelow<Found>(cursor: SyntaxCursor, readNode: ReadNode<Found>): Generator<Found> {
  for (let depth = START_DEPTH, isArriving = true; ;) {
    if (isArriving) {
      const { found, shouldDescend } = readNode(cursor.currentNode)
      yield* found
      if (shouldDescend && cursor.gotoFirstChild()) {
        depth += 1
        continue
      }
    }
    if (depth === START_DEPTH) return
    isArriving = cursor.gotoNextSibling()
    if (isArriving) continue
    cursor.gotoParent()
    depth -= 1
  }
}

export const collectFromNode = <Found>(node: SyntaxNode, readNode: ReadNode<Found>): Found[] => [
  ...collectBelow(node.walk(), readNode),
]

export function* chainFrom(start: SyntaxNode | null, nextOf: (node: SyntaxNode) => SyntaxNode | null): Generator<SyntaxNode> {
  for (let current = start; current !== null; current = nextOf(current)) yield current
}

const childTowards = (node: SyntaxNode) => (current: SyntaxNode): SyntaxNode | null => (current.id === node.id ? null : current.childWithDescendant(node))

export const selfAndAncestorsOf = (node: SyntaxNode): SyntaxNode[] => [...chainFrom(node.tree.rootNode, childTowards(node))].reverse()
