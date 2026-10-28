import { z } from "zod"

export const searchReviewBaseBranchesInputSchema = z.strictObject({
  repositoryName: z.string(),
  query: z.string(),
})

export type SearchReviewBaseBranchesInput = z.infer<typeof searchReviewBaseBranchesInputSchema>
