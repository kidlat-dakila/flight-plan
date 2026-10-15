import type { ProseBlocks, ProseListItem } from "@/lib/review-content"

export interface SectionSummary {
  readonly names: readonly string[]
  readonly moreCount: number
}

const SHOWN_NAME_COUNT = 4

const codeLinkTextsOf = (item: ProseListItem): string[] =>
  item.inlines.flatMap((inline) => (inline.kind === "code-link" ? [inline.text] : []))

const codeTextsOf = (item: ProseListItem): string[] =>
  item.inlines.flatMap((inline) => (inline.kind === "code" ? [inline.text] : []))

const namesOf = (item: ProseListItem): string[] => [...codeLinkTextsOf(item), ...codeTextsOf(item)].slice(0, 1)

export const sectionSummaryOf = (blocks: ProseBlocks): SectionSummary | null => {
  const items = blocks.flatMap((block) => (block.kind === "list" ? block.items : []))
  if (items.length === 0) return null
  const names = items.flatMap(namesOf)
  return { names: names.slice(0, SHOWN_NAME_COUNT), moreCount: Math.max(0, names.length - SHOWN_NAME_COUNT) }
}
