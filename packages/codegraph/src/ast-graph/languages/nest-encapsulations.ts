import type { SyntaxNode } from "@/ast-graph/parser"
import type { Encapsulation, EncapsulationKind, SourceRange } from "@/ast-graph/types"

export interface FoundEncapsulation {
  readonly node: SyntaxNode
  readonly name: string
  readonly kind: EncapsulationKind
  readonly range: SourceRange
}

const isInside = (inner: SyntaxNode, outer: SyntaxNode): boolean =>
  outer.startIndex <= inner.startIndex && inner.endIndex <= outer.endIndex && inner.id !== outer.id

export const nestEncapsulations = (roots: readonly FoundEncapsulation[], nested: readonly FoundEncapsulation[]): Encapsulation[] => {
  const nest = ({ node, name, kind, range }: FoundEncapsulation): Encapsulation => {
    const below = nested.filter((inner) => isInside(inner.node, node))
    const direct = below.filter((inner) => !below.some((outer) => isInside(inner.node, outer.node)))
    return { name, kind, range, encapsulations: direct.map(nest) }
  }
  return roots.map(nest)
}
