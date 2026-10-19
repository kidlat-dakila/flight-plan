import type { ProcedureContext } from "@/procedures/context"
import { saveReviewPreferences } from "@/procedures/save-review-preferences"
import { saveSetupStep } from "@/procedures/save-setup-step"
import type { ReviewSettingsInput, SaveSettingsInput, SettingsSaving, StepSettingsInput } from "./utils/schemas"
import { SAVED_MESSAGES, toStepInput } from "./utils/step-input"

const saveStepSettings = async (
  input: StepSettingsInput,
  message: string,
  context: ProcedureContext,
): Promise<SettingsSaving> => {
  const saving = await saveSetupStep(toStepInput(input), context)
  return saving.kind === "rejected" ? saving : { kind: "saved", message }
}

const saveReviewSettings = async (input: ReviewSettingsInput, context: ProcedureContext): Promise<SettingsSaving> => {
  const preferencesSaving = await saveReviewPreferences(input.preferences, context)
  if (preferencesSaving.kind === "rejected") return preferencesSaving
  return await saveStepSettings(
    { section: "configuration", configurationId: input.configurationId },
    SAVED_MESSAGES.review,
    context,
  )
}

export const saveSettings = async (input: SaveSettingsInput, context: ProcedureContext): Promise<SettingsSaving> =>
  input.section === "review"
    ? await saveReviewSettings(input, context)
    : await saveStepSettings(input, SAVED_MESSAGES[input.section], context)
