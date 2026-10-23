import type { ProcedureContext } from "@/procedures/context"
import { savedVersionOf } from "@/procedures/get-review/utils/stored-review"
import { ARTIFACT_MIGRATIONS } from "./utils/artifact-migrations"
import { planReviewMigration } from "./utils/plan-review-migration"
import { reviewVersionStateOf } from "./utils/review-version"
import type { MigrateReviewInput, ReviewMigration } from "./utils/schemas"

const MIGRATED_MESSAGE = "Flight Plan updated"
const UNMIGRATED_MESSAGE = "This Flight Plan could not be brought to the shape of this version of Flight Plan."

export const migrateReview = async (input: MigrateReviewInput, context: ProcedureContext): Promise<ReviewMigration | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const text = await context.reviewStore.readStoredText(key)
  if (text === null) return null
  const state = reviewVersionStateOf(savedVersionOf(text), context.runningVersion, ARTIFACT_MIGRATIONS)
  const scaffold = planReviewMigration(text, state, ARTIFACT_MIGRATIONS)
  if (scaffold === null) throw new Error(UNMIGRATED_MESSAGE)
  await context.reviewStore.writeScaffold(key, scaffold)
  return { message: MIGRATED_MESSAGE }
}
