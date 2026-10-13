import type { ProcedureContext } from "@/procedures/context"
import { saveSetupStep } from "@/procedures/save-setup-step"
import type { SaveSettingsInput, SettingsSaving } from "./utils/schemas"
import { SAVED_MESSAGES, toStepInput } from "./utils/step-input"

export const saveSettings = async (input: SaveSettingsInput, context: ProcedureContext): Promise<SettingsSaving> => {
  const saving = await saveSetupStep(toStepInput(input), context)
  return saving.kind === "rejected" ? saving : { kind: "saved", message: SAVED_MESSAGES[input.section] }
}
