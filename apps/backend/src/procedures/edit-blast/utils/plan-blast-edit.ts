import { unresolvedLinkIdsIn } from "@/procedures/update-nodes/utils/written-links"
import { isChangedFile } from "@flightplan/codegraph"
import type { BlastImpactChoice, BlastNode, ImpactType, ReviewArtifact, Segment } from "@flightplan/configurations"

export interface BlastEdit {
  readonly path: string
  readonly impactType: BlastImpactChoice
  readonly impactReason: string
}

export type PlannedBlastEdit
  = | { readonly kind: "planned", readonly artifact: ReviewArtifact }
    | { readonly kind: "rejected", readonly message: string }

const MISSING_FILE_MESSAGE = "This file is no longer in the Blast Diagram."
const CHANGED_FILE_MESSAGE = "This file is part of the change. An impact is what the change does to a file it did not touch."
const MISSING_REASON_MESSAGE = "Write the reason. A file the change breaks or changes needs one."

const REASONED_IMPACT_TYPES: readonly BlastImpactChoice[] = ["breaks", "behaviour-changes"]

const reject = (message: string): PlannedBlastEdit => ({ kind: "rejected", message })

const unresolvedLinksMessage = (linkIds: readonly string[]): string =>
  `${linkIds.length === 1 ? "This code link points" : "These code links point"} at code the Flight Plan does not hold: ${linkIds.join(", ")}.`

const impactTypeOf = (choice: BlastImpactChoice): ImpactType | null => (choice === "unassessed" ? null : choice)

const withImpact = (node: BlastNode, { path, impactType, impactReason }: BlastEdit): BlastNode =>
  node.path === path
    ? { ...node, impactType: impactTypeOf(impactType), impactReason: REASONED_IMPACT_TYPES.includes(impactType) ? impactReason : null }
    : node

const withEditedBlast = (segment: Segment, edit: BlastEdit): Segment =>
  segment.blastDiagram === null
    ? segment
    : { ...segment, blastDiagram: { ...segment.blastDiagram, nodes: segment.blastDiagram.nodes.map((node) => withImpact(node, edit)) } }

export const planBlastEdit = (artifact: ReviewArtifact, edit: BlastEdit): PlannedBlastEdit => {
  const impactReason = edit.impactReason.trim()
  const nodes = artifact.segments.flatMap((segment) => segment.blastDiagram?.nodes ?? []).filter((node) => node.path === edit.path)
  if (nodes.length === 0) return reject(MISSING_FILE_MESSAGE)
  if (nodes.some(isChangedFile)) return reject(CHANGED_FILE_MESSAGE)
  if (!REASONED_IMPACT_TYPES.includes(edit.impactType)) {
    return { kind: "planned", artifact: { ...artifact, segments: artifact.segments.map((segment) => withEditedBlast(segment, edit)) } }
  }
  if (impactReason === "") return reject(MISSING_REASON_MESSAGE)
  const unresolvedLinkIds = unresolvedLinkIdsIn([impactReason], artifact.sources)
  if (unresolvedLinkIds.length > 0) return reject(unresolvedLinksMessage(unresolvedLinkIds))
  return {
    kind: "planned",
    artifact: { ...artifact, segments: artifact.segments.map((segment) => withEditedBlast(segment, { ...edit, impactReason })) },
  }
}
