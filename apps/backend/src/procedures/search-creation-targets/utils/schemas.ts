import { z } from "zod"

export const searchCreationTargetsInputSchema = z.strictObject({
  repositoryName: z.string(),
  query: z.string(),
})

export const targetOptionSchema = z.strictObject({
  id: z.string(),
  label: z.string(),
  detail: z.string(),
  stateLabel: z.string().nullable(),
  isDisabled: z.boolean(),
})

export const targetSuggestionsSchema = z.strictObject({
  options: z.array(targetOptionSchema),
  message: z.string().nullable(),
})

export type SearchCreationTargetsInput = z.infer<typeof searchCreationTargetsInputSchema>
export type TargetOption = z.infer<typeof targetOptionSchema>
export type TargetSuggestions = z.infer<typeof targetSuggestionsSchema>
