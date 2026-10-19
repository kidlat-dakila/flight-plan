import type { ProcedureContext } from "@/procedures/context"
import { buildReviewPreferencesPage } from "./utils/build-review-preferences-page"
import type { GetReviewPreferencesInput, ReviewPreferencesPage } from "./utils/schemas"

export const getReviewPreferences = async (
  _input: GetReviewPreferencesInput,
  context: ProcedureContext,
): Promise<ReviewPreferencesPage> => buildReviewPreferencesPage(await context.setupStore.read())
