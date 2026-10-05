import type { ReviewArtifact, Segment } from "@/procedures/get-review/utils/review-artifact"

export interface Refusal {
  readonly kind: "refused"
  readonly message: string
}

export interface SegmentsAmendment {
  readonly kind: "amended"
  readonly segments: readonly Segment[]
}

export interface ArtifactAmended {
  readonly kind: "amended"
  readonly artifact: ReviewArtifact
}

export type SegmentsOutcome = Refusal | SegmentsAmendment

const NOTHING_WRITTEN = "Nothing was written."

export const refuse = (message: string): Refusal => ({ kind: "refused", message: `${message} ${NOTHING_WRITTEN}` })

const quoted = (ids: readonly string[]): string => [...new Set(ids)].map((id) => `\`${id}\``).join(", ")

const countOf = (ids: readonly string[], id: string): number => ids.filter((candidate) => candidate === id).length

export const idProblemOf = (noun: string, wantedIds: readonly string[], knownIds: readonly string[]): string | null => {
  const repeatedIds = wantedIds.filter((id) => countOf(wantedIds, id) > 1)
  if (repeatedIds.length > 0) return `This call names the ${noun} ${quoted(repeatedIds)} more than once.`
  const unknownIds = wantedIds.filter((id) => !knownIds.includes(id))
  if (unknownIds.length > 0) {
    return `This artifact has no ${noun} ${quoted(unknownIds)}. Read the overview for the ones it has.`
  }
  const sharedIds = wantedIds.filter((id) => countOf(knownIds, id) > 1)
  return sharedIds.length > 0
    ? `More than one segment has a ${noun} ${quoted(sharedIds)}. Name the segment with segmentId.`
    : null
}

export const withSegments = (artifact: ReviewArtifact, amendedSegments: readonly Segment[]): ReviewArtifact => ({
  ...artifact,
  segments: artifact.segments.map((segment) => amendedSegments.find((amended) => amended.id === segment.id) ?? segment),
})
