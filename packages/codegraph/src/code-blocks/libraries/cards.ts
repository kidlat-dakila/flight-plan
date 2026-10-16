import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { ReadBlock } from "@/code-blocks/reading"
import { FIRST_COLUMN, FIRST_LINE } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import type { CardSeed, ExportCardReading, Library } from "./types"

const pointOf = ({ line, column }: SourceRange["start"]): { row: number, column: number } => ({ row: line - FIRST_LINE, column: column - FIRST_COLUMN })

export const nodeFinderOf = (tree: SyntaxTree) => ({ start, end }: SourceRange): SyntaxNode =>
  tree.rootNode.namedDescendantForPosition(pointOf(start), pointOf(end))

const readSeeds = (library: Library, matches: readonly PatternMatch[], blocks: readonly ReadBlock[], nodeAt: (range: SourceRange) => SyntaxNode): readonly CardSeed[] => {
  const own = matches.filter((match) => match.library === library.name)
  return library.readCards === undefined || own.length === 0 ? [] : library.readCards({ matches: own, blocks, nodeAt })
}

const readExportSeeds = (library: Library, reading: ExportCardReading): readonly CardSeed[] => {
  const own = reading.namings.filter((naming) => naming.library === library.name)
  return library.readExportCards === undefined || own.length === 0 ? [] : library.readExportCards({ ...reading, namings: own })
}

const withSeed = (block: ReadBlock, seed: CardSeed | undefined): ReadBlock =>
  seed === undefined || block.card !== undefined ? block : { ...block, card: seed.card, ...(seed.name === undefined ? {} : { name: seed.name }) }

const withSeeds = (blocks: readonly ReadBlock[], seeds: readonly CardSeed[]): ReadBlock[] => {
  const seedById = new Map(firstOfEach(seeds, (seed) => seed.blockId).map((seed) => [seed.blockId, seed] as const))
  return blocks.map((block) => withSeed(block, seedById.get(block.id)))
}

export const withCards = (blocks: readonly ReadBlock[], matches: readonly PatternMatch[], tree: SyntaxTree, libraries: readonly Library[]): ReadBlock[] => {
  const nodeAt = nodeFinderOf(tree)
  return withSeeds(blocks, libraries.flatMap((library) => readSeeds(library, matches, blocks, nodeAt)))
}

export const withExportCards = (blocks: readonly ReadBlock[], reading: ExportCardReading, libraries: readonly Library[]): ReadBlock[] =>
  withSeeds(blocks, libraries.flatMap((library) => readExportSeeds(library, reading)))
