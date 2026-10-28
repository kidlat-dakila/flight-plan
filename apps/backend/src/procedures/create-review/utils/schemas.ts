import { z } from "zod"

export const createReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  baseBranch: z.string().trim().min(1),
})

export const createReviewResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("created") }),
  z.strictObject({ kind: z.literal("unavailable"), message: z.string() }),
])

export type CreateReviewInput = z.infer<typeof createReviewInputSchema>
export type CreateReviewResult = z.infer<typeof createReviewResultSchema>
