import type { ProcedureContext } from "@/procedures/context"
import { findReviewTarget, markAgentActivity } from "@/procedures/get-conversation/utils/conversation-actions"
import type { InstructionSource } from "@/procedures/get-instructions/utils/resolve-instructions"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { findConfiguration, shippedConfigurationOf } from "@/procedures/list-configurations/utils/configuration"
import { BASE_PRESET_NAME, type ReviewArtifact, type SectionSwitches } from "@flightplan/configurations"
import { sectionsOf } from "./artifact-sections"
import { requiresContextCodeBlocks } from "./context-code-blocks"

export interface ArtifactRejection {
  readonly kind: "rejected"
  readonly message: string
}

export interface OpenedArtifact {
  readonly kind: "opened"
  readonly artifact: ReviewArtifact
  readonly configuration: InstructionSource
  readonly sections: SectionSwitches
  readonly requiresContextCodeBlocks: boolean
}

export const missingArtifactRejection = (key: ReviewKey): ArtifactRejection => ({
  kind: "rejected",
  message: `No review artifact exists for ${key.targetId} of ${key.repositoryName} yet. The reviewer starts a review in Flight Plan's web app, which builds the artifact. Ask them to start it there, then call this again.`,
})

export const openArtifact = async (key: ReviewKey, context: ProcedureContext): Promise<ArtifactRejection | OpenedArtifact> => {
  const target = await findReviewTarget(key, context)
  if (target.kind === "rejected") return target
  markAgentActivity(key, context)
  const [artifact, request, savedConfigurations] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findRequest(key),
    context.configurationStore.read(),
  ])
  if (artifact === null) return missingArtifactRejection(key)
  const preset = request?.preset ?? BASE_PRESET_NAME
  const configuration = findConfiguration(savedConfigurations, request?.configurationId ?? preset) ?? shippedConfigurationOf(preset)
  return {
    kind: "opened",
    artifact,
    configuration,
    sections: sectionsOf(artifact),
    requiresContextCodeBlocks: requiresContextCodeBlocks(artifact),
  }
}
