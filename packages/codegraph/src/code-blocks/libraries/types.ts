import type { SyntaxNode } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { CatalogueLibrary } from "@/catalogue/types"
import type { ReadBlock } from "@/code-blocks/reading"
import type { BlockCard, SourceRange } from "@/code-blocks/types"

export interface CardReading {
  readonly matches: readonly PatternMatch[]
  readonly blocks: readonly ReadBlock[]
  readonly nodeAt: (range: SourceRange) => SyntaxNode
}

export interface CardSeed {
  readonly blockId: string
  readonly card: BlockCard
  readonly name?: string
}

export interface Library extends CatalogueLibrary {
  readonly readCards?: (reading: CardReading) => readonly CardSeed[]
}
