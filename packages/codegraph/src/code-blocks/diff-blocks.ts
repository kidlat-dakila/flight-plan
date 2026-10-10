import { clipRange, compareRanges, containsRange, isBefore, rangeKey, touchesRange } from "./source-range"
import type { StoredCodeBlock } from "./stored-types"
import type { SourceRange } from "./types"

export interface PlacedDiff {
  readonly blockId: string
  readonly range: SourceRange
}

interface BlockSpan {
  readonly blockId: string
  readonly range: SourceRange
  readonly order: number
}

interface Uncovered {
  readonly from: SourceRange["start"]
  readonly gaps: readonly SourceRange[]
}

const spansOf = (blocks: readonly StoredCodeBlock[]): BlockSpan[] =>
  [...blocks.flatMap((block, depthOrder) => block.lineOfCodeRangeReference.map((range) => ({ blockId: block.id, range, depthOrder })))]
    .sort((one, two) => compareRanges(one.range, two.range) || one.depthOrder - two.depthOrder)
    .map(({ blockId, range }, order) => ({ blockId, range, order }))

const isInside = (span: BlockSpan, holder: BlockSpan): boolean => span.order > holder.order && containsRange(holder.range, span.range)

const outermostOf = (spans: readonly BlockSpan[]): BlockSpan[] =>
  spans.filter((span) => spans.every((other) => !isInside(span, other)))

const uncoveredBy = (covering: readonly BlockSpan[], range: SourceRange): SourceRange[] => {
  const { from, gaps } = covering.reduce<Uncovered>(
    (uncovered, { range: covered }) => ({
      from: isBefore(uncovered.from, covered.end) ? covered.end : uncovered.from,
      gaps: isBefore(uncovered.from, covered.start) ? [...uncovered.gaps, { start: uncovered.from, end: covered.start }] : uncovered.gaps,
    }),
    { from: range.start, gaps: [] },
  )
  return isBefore(from, range.end) ? [...gaps, { start: from, end: range.end }] : [...gaps]
}

const placeWithin = (holder: BlockSpan | null, range: SourceRange, inside: readonly BlockSpan[]): PlacedDiff[] => {
  const touched = outermostOf(inside.filter((span) => touchesRange(span.range, range)))
  const own = holder === null ? [] : [holder.blockId]
  if (touched.length === 0) return own.map((blockId) => ({ blockId, range }))
  return [
    ...touched.flatMap((span) => placeWithin(span, clipRange(range, span.range), inside.filter((inner) => isInside(inner, span)))),
    ...uncoveredBy(touched, range).flatMap((gap) => own.map((blockId) => ({ blockId, range: gap }))),
  ]
}

const nearestRootOf = (blocks: readonly StoredCodeBlock[], range: SourceRange): StoredCodeBlock | null => {
  const roots = blocks.filter((block) => block.isRoot)
  const following = roots.find((root) => !isBefore(root.lineOfCodeRangeReference[0].start, range.end))
  return following ?? (roots.length === 0 ? null : roots[roots.length - 1])
}

const placeRange = (blocks: readonly StoredCodeBlock[], spans: readonly BlockSpan[], range: SourceRange): PlacedDiff[] => {
  const placed = placeWithin(null, range, spans)
  if (placed.length > 0) return placed
  const nearest = nearestRootOf(blocks, range)
  return nearest === null ? [] : [{ blockId: nearest.id, range }]
}

const withoutRepeats = (placed: readonly PlacedDiff[]): PlacedDiff[] => {
  const keys = placed.map(({ blockId, range }) => `${blockId}@${rangeKey(range)}`)
  return placed.filter((_one, index) => keys.indexOf(keys[index]) === index)
}

export const placeDiffRanges = (blocks: readonly StoredCodeBlock[], diffRanges: readonly SourceRange[]): PlacedDiff[] => {
  const spans = spansOf(blocks)
  return withoutRepeats(diffRanges.flatMap((range) => placeRange(blocks, spans, range)))
}
