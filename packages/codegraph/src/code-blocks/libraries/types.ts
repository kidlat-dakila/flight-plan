import type { SyntaxNode } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { CatalogueLibrary } from "@/catalogue/types"
import type { FileExports, LibraryUse, ReadBlock } from "@/code-blocks/reading"
import type { BlockCard, CodeBlockCatalogue, SourceRange } from "@/code-blocks/types"

export interface CardReading {
  readonly matches: readonly PatternMatch[]
  readonly blocks: readonly ReadBlock[]
  readonly nodeAt: (range: SourceRange) => SyntaxNode
}

export interface BlockNaming {
  readonly blockId: string
  readonly library: string
  readonly exportedNames: readonly string[]
  readonly catalogue: CodeBlockCatalogue
}

export interface ExportCardReading {
  readonly namings: readonly BlockNaming[]
  readonly exports: FileExports
  readonly nodeAt: ((range: SourceRange) => SyntaxNode) | null
}

export interface CardSeed {
  readonly blockId: string
  readonly card: BlockCard
  readonly name?: string
}

export interface Library extends CatalogueLibrary {
  readonly readCards?: (reading: CardReading) => readonly CardSeed[]
  readonly readExportCards?: (reading: ExportCardReading) => readonly CardSeed[]
  readonly readUses?: (reading: CardReading) => readonly LibraryUse[]
}
