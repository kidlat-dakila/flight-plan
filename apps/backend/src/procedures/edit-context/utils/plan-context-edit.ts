import { unresolvedLinkIdsIn } from "@/procedures/update-nodes/utils/written-links"
import type { ReviewArtifact, Segment } from "@flightplan/configurations"

export interface ContextEdit {
  readonly segmentId: string
  readonly context: string
}

export type PlannedContextEdit
  = | { readonly kind: "planned", readonly artifact: ReviewArtifact }
    | { readonly kind: "rejected", readonly message: string }

const EMPTY_CONTEXT_MESSAGE = "Write the context. A segment cannot be without one."
const MISSING_SEGMENT_MESSAGE = "This segment is no longer in the Flight Plan."

const reject = (message: string): PlannedContextEdit => ({ kind: "rejected", message })

const unresolvedLinksMessage = (linkIds: readonly string[]): string =>
  `${linkIds.length === 1 ? "This code link points" : "These code links point"} at code the Flight Plan does not hold: ${linkIds.join(", ")}.`

const withContext = (segment: Segment, { segmentId, context }: ContextEdit): Segment =>
  segment.id === segmentId ? { ...segment, context } : segment

export const planContextEdit = (artifact: ReviewArtifact, edit: ContextEdit): PlannedContextEdit => {
  const context = edit.context.trim()
  if (context === "") return reject(EMPTY_CONTEXT_MESSAGE)
  if (!artifact.segments.some((segment) => segment.id === edit.segmentId)) return reject(MISSING_SEGMENT_MESSAGE)
  const unresolvedLinkIds = unresolvedLinkIdsIn([context], artifact.sources)
  if (unresolvedLinkIds.length > 0) return reject(unresolvedLinksMessage(unresolvedLinkIds))
  return {
    kind: "planned",
    artifact: { ...artifact, segments: artifact.segments.map((segment) => withContext(segment, { ...edit, context })) },
  }
}
