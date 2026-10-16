import type { SyntaxNode, SyntaxTree } from "@/ast-graph/parser"
import type { PatternMatch } from "@/catalogue/matching/match-sites"
import type { ReadBlock } from "@/code-blocks/reading"
import { FIRST_COLUMN, FIRST_LINE } from "@/code-blocks/source-range"
import type { SourceRange } from "@/code-blocks/types"
import { firstOfEach } from "@/shared/first-of-each"
import type { CardSeed, Library } from "./types"

const pointOf = ({ line, column }: SourceRange["start"]): { row: number, column: number } => ({ row: line - FIRST_LINE, column: column - FIRST_COLUMN })

export const nodeFinderOf = (tree: SyntaxTree) => ({ start, end }: SourceRange): SyntaxNode =>
  tree.rootNode.namedDescendantForPosition(pointOf(start), pointOf(end))

const readSeeds = (library: Library, matches: readonly PatternMatch[], blocks: readonly ReadBlock[], nodeAt: (range: SourceRange) => SyntaxNode): readonly CardSeed[] => {
  const own = matches.filter((match) => match.library === library.name)
  return library.readCards === undefined || own.length === 0 ? [] : library.readCards({ matches: own, blocks, nodeAt })
}

const withSeed = (block: ReadBlock, seed: CardSeed | undefined): ReadBlock =>
  seed === undefined ? block : { ...block, card: seed.card, ...(seed.name === undefined ? {} : { name: seed.name }) }

export const withCards = (blocks: readonly ReadBlock[], matches: readonly PatternMatch[], tree: SyntaxTree, libraries: readonly Library[]): ReadBlock[] => {
  const nodeAt = nodeFinderOf(tree)
  const seeds = firstOfEach(libraries.flatMap((library) => readSeeds(library, matches, blocks, nodeAt)), (seed) => seed.blockId)
  const seedById = new Map(seeds.map((seed) => [seed.blockId, seed] as const))
  return blocks.map((block) => withSeed(block, seedById.get(block.id)))
}
