import { groupOf, type FixtureFiles } from "@/code-blocks/__tests__/group-fixture"
import type { StoredCodeBlock } from "@/code-blocks/stored-types"

const nameOf = (block: StoredCodeBlock | undefined): string => block?.name ?? block?.type ?? "none"

const lineOf = (block: StoredCodeBlock, blockById: ReadonlyMap<string, StoredCodeBlock>): string => {
  const card = block.card
  if (card === undefined) return ""
  const owner = card.ownerId === null ? "" : ` in ${nameOf(blockById.get(card.ownerId))}`
  const heading = card.heading === null ? "" : ` under ${card.heading}`
  const groupKey = card.groupKey === null ? "" : ` at ${card.groupKey}`
  return `${nameOf(block)}: ${card.library} ${card.kind} ${card.part}${heading}${groupKey}${owner}`
}

export const cardsOf = (files: FixtureFiles): string[] => {
  const { codeBlocks } = groupOf(files)
  const blockById = new Map(codeBlocks.map((block) => [block.id, block] as const))
  return codeBlocks.filter((block) => block.card !== undefined).map((block) => lineOf(block, blockById))
}
