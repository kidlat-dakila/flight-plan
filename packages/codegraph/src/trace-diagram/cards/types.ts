import type { CardKind, CodeBlock, JourneyNode, JourneyNodeEdge } from "@flightplan/configurations"

export type ParentIdById = ReadonlyMap<string, string>

export interface CardContext {
  readonly nodes: readonly JourneyNode[]
  readonly edges: readonly JourneyNodeEdge[]
  readonly importerCountByPath: ReadonlyMap<string, number>
}

export interface NodeGroup {
  readonly node: JourneyNode
  readonly memberIds: readonly string[]
  readonly placedAtId: string
}

export interface CardRules {
  readonly kind: string
  readonly isNodeBlock: (block: CodeBlock, isNode: (other: CodeBlock) => boolean) => boolean
  readonly isNotNodeBlock: (block: CodeBlock) => boolean
  readonly listParents: (context: CardContext) => ParentIdById
  readonly listLeftOutNodeIds: (context: CardContext) => ReadonlySet<string>
  readonly groupNodes: (nodes: readonly JourneyNode[]) => readonly NodeGroup[]
  readonly listAddedEdges: (context: CardContext) => readonly JourneyNodeEdge[]
  readonly listLeftOutEdgeIds: (context: CardContext) => ReadonlySet<string>
}

export interface LibraryCardRules {
  readonly library: string
  readonly extends: CardKind
  readonly rules: Partial<Omit<CardRules, "kind">>
}
