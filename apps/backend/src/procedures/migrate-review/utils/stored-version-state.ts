import type { ProcedureContext } from "@/procedures/context"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import { savedVersionOf } from "@/procedures/get-review/utils/stored-review"
import type { ReviewArtifact } from "@flightplan/configurations"
import { ARTIFACT_MIGRATIONS } from "./artifact-migrations"
import { CURRENT_REVIEW, reviewVersionStateOf, type ReviewVersionState } from "./review-version"

type VersionContext = Pick<ProcedureContext, "reviewStore" | "runningVersion">

export const readReviewVersionState = async (key: ReviewKey, context: VersionContext): Promise<ReviewVersionState> => {
  const text = await context.reviewStore.readStoredText(key)
  return text === null ? CURRENT_REVIEW : reviewVersionStateOf(savedVersionOf(text), context.runningVersion, ARTIFACT_MIGRATIONS)
}

export const findCurrentArtifact = async (key: ReviewKey, context: VersionContext): Promise<ReviewArtifact | null> =>
  (await readReviewVersionState(key, context)).kind === "current" ? await context.reviewStore.findArtifact(key) : null

export const hasStoredReview = async (key: ReviewKey, context: Pick<ProcedureContext, "reviewStore">): Promise<boolean> =>
  (await context.reviewStore.readStoredText(key)) !== null || (await context.reviewStore.findArtifact(key)) !== null
