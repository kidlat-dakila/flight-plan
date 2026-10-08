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
