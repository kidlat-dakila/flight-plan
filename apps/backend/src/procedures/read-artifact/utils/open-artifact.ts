import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget, markAgentActivity } from "@/procedures/get-conversation/utils/conversation-actions"
import type { ReviewArtifact } from "@/procedures/get-review/utils/review-artifact"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { BASE_PRESET_NAME, PRESET_SECTIONS, type PresetName, type SectionSwitches } from "@flightplan/configurations"

export interface ArtifactRejection {
  readonly kind: "rejected"
  readonly message: string
}

export interface OpenedArtifact {
  readonly kind: "opened"
  readonly artifact: ReviewArtifact
  readonly preset: PresetName
  readonly sections: SectionSwitches
}

export const missingArtifactRejection = (key: ReviewKey): ArtifactRejection => ({
  kind: "rejected",
  message: `No review artifact exists for ${key.targetId} of ${key.repositoryName} yet. The reviewer starts a review in Flight Plan's web app, which builds the artifact. Ask them to start it there, then call this again.`,
})

export const openArtifact = async (key: ReviewKey, context: ProcedureContext): Promise<ArtifactRejection | OpenedArtifact> => {
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  markAgentActivity(key, context)
  const [artifact, request] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findRequest(key),
  ])
  if (artifact === null) return missingArtifactRejection(key)
  const preset = request?.preset ?? BASE_PRESET_NAME
  return { kind: "opened", artifact, preset, sections: PRESET_SECTIONS[preset] }
}
