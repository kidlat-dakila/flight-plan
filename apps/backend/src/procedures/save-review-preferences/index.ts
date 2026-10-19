import type { ProcedureContext } from "@/procedures/context"
import { toPreferencesData } from "@/procedures/get-review-preferences/utils/schemas"
import { planPreferencesSaving } from "./utils/plan-preferences-saving"
import type { PreferencesSaving, SaveReviewPreferencesInput } from "./utils/schemas"

export const saveReviewPreferences = async (
  input: SaveReviewPreferencesInput,
  context: ProcedureContext,
): Promise<PreferencesSaving> => {
  const plan = planPreferencesSaving(input)
  if (plan.kind === "rejected") return plan
  const setup = await context.setupStore.read()
  await context.setupStore.write({ ...setup, reviewPreferences: plan.preferences })
  return { kind: "saved", preferences: toPreferencesData(plan.preferences) }
}
