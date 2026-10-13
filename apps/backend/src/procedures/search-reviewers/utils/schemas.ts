import { z } from "zod"
import { reviewKeyShape } from "@/procedures/get-review/utils/schemas-review-action"

const MAX_QUERY_LENGTH = 100

export const searchReviewersInputSchema = z.strictObject({ ...reviewKeyShape, query: z.string().max(MAX_QUERY_LENGTH) })

export const reviewerOptionsSchema = z.array(
  z.strictObject({
    login: z.string(),
    name: z.string(),
    detail: z.string(),
    avatarUrl: z.string().nullable(),
    monogram: z.string(),
  }),
)

export type SearchReviewersInput = z.infer<typeof searchReviewersInputSchema>
export type ReviewerOption = z.infer<typeof reviewerOptionsSchema>[number]
