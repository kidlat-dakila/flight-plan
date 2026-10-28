import { z } from "zod"
import { targetSuggestionsSchema } from "@/procedures/search-creation-targets/utils/schemas"

export const searchBaseBranchesInputSchema = z.strictObject({
  path: z.string(),
  query: z.string(),
})

export const baseBranchSuggestionsSchema = targetSuggestionsSchema.extend({
  detectedBranch: z.string().nullable(),
})

export type SearchBaseBranchesInput = z.infer<typeof searchBaseBranchesInputSchema>
export type BaseBranchSuggestions = z.infer<typeof baseBranchSuggestionsSchema>
