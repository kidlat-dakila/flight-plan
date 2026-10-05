import type { ProcedureContext } from "@/procedures/context"
import type { ReviewArtifact } from "@/procedures/get-review/utils/review-artifact"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { missingArtifactRejection } from "@/procedures/read-artifact/utils/open-artifact"
import { tallyWork, unwrittenWork } from "@/procedures/read-artifact/utils/unwritten-work"
import type { SectionSwitches } from "@flightplan/configurations"
import type { ArtifactAmended, Refusal } from "./refusal"
import type { ArtifactWriting } from "./schemas"

const DRAFTING_STATUS = "drafting"

export const writeAmendment = async (
  key: ReviewKey,
  sections: SectionSwitches,
  note: string,
  amend: (artifact: ReviewArtifact) => ArtifactAmended | Refusal,
  context: ProcedureContext,
): Promise<ArtifactWriting> => {
  const writing = await context.reviewStore.amendArtifact<ArtifactWriting>(key, (artifact) => {
    const amendment = amend(artifact)
    if (amendment.kind === "refused") return { artifact: null, outcome: { kind: "rejected", message: amendment.message } }
    const drafted = { ...amendment.artifact, status: DRAFTING_STATUS } as const
    return { artifact: drafted, outcome: { kind: "written", note, unwritten: tallyWork(unwrittenWork(drafted, sections)) } }
  })
  return writing ?? missingArtifactRejection(key)
}
