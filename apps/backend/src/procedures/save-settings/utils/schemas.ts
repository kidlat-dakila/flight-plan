import { z } from "zod"
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
])

export const settingsSavingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved"), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string(), field: rejectedFieldSchema.nullable() }),
])

export type SaveSettingsInput = z.infer<typeof saveSettingsInputSchema>
export type SettingsSaving = z.infer<typeof settingsSavingSchema>
