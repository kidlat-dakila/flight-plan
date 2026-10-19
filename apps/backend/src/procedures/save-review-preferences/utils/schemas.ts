import { z } from "zod"
import { reviewPreferencesSchema } from "@/procedures/get-review-preferences/utils/schemas"

export const saveReviewPreferencesInputSchema = reviewPreferencesSchema

export const preferencesSavingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved"), preferences: reviewPreferencesSchema }),
  z.strictObject({
    kind: z.literal("rejected"),
    message: z.string(),
    field: z.strictObject({ owner: z.string(), name: z.string() }),
  }),
])

export type SaveReviewPreferencesInput = z.infer<typeof saveReviewPreferencesInputSchema>
export type PreferencesSaving = z.infer<typeof preferencesSavingSchema>
