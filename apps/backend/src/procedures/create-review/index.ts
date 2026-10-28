import type { ProcedureContext } from "@/procedures/context"
import { findReviewSubject } from "@/procedures/get-review"
import { buildOpeningArtifact, isOpenedWithoutArtifact } from "@/procedures/get-review/utils/opening-scaffold"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { ReviewSubject } from "@/procedures/get-review/utils/review-subject"
import { hasStoredReview } from "@/procedures/migrate-review/utils/stored-version-state"
import type { CreateReviewInput, CreateReviewResult } from "./utils/schemas"

const NOT_LISTED_MESSAGE = "This review target is not listed in Flight Plan."
const ALREADY_CREATED_MESSAGE = "This review already has a review artifact."
const CREATED: CreateReviewResult = { kind: "created" }

const unavailable = (message: string): CreateReviewResult => ({ kind: "unavailable", message })

const isCreatable = async (subject: ReviewSubject, key: ReviewKey, context: ProcedureContext): Promise<boolean> =>
  isOpenedWithoutArtifact(subject) && !(await hasStoredReview(key, context))

export const createReview = async (input: CreateReviewInput, context: ProcedureContext): Promise<CreateReviewResult> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const subject = await findReviewSubject(key, context)
  if (subject === null) return unavailable(NOT_LISTED_MESSAGE)
  if (!(await isCreatable(subject, key, context))) return unavailable(ALREADY_CREATED_MESSAGE)
  const opening = await buildOpeningArtifact(subject, key, input.baseBranch, context)
  return opening.kind === "built" ? CREATED : unavailable(opening.message)
}
