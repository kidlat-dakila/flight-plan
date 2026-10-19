import { z } from "zod"
import { reviewPreferencesSchema } from "@/procedures/get-review-preferences/utils/schemas"
import {
  agentsInputSchema,
  configurationInputSchema,
  forgesInputSchema,
  rejectedFieldSchema,
} from "@/procedures/save-setup-step/utils/schemas"

export const saveSettingsInputSchema = z.discriminatedUnion("section", [
  agentsInputSchema.omit({ step: true }).extend({ section: z.literal("agents") }),
  forgesInputSchema.omit({ step: true }).extend({ section: z.literal("forges") }),
  configurationInputSchema.omit({ step: true }).extend({ section: z.literal("configuration") }),
  configurationInputSchema.omit({ step: true }).extend({ section: z.literal("review"), preferences: reviewPreferencesSchema }),
])

export const settingsSavingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved"), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string(), field: rejectedFieldSchema.nullable() }),
])

export type SaveSettingsInput = z.infer<typeof saveSettingsInputSchema>
export type StepSettingsInput = Exclude<SaveSettingsInput, { section: "review" }>
export type ReviewSettingsInput = Extract<SaveSettingsInput, { section: "review" }>
export type SettingsSaving = z.infer<typeof settingsSavingSchema>
