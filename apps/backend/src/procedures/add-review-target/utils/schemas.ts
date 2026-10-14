import { z } from "zod"

export const addReviewTargetInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
})

export const addedReviewTargetSchema = z.strictObject({ targetId: z.string() })

export type AddReviewTargetInput = z.infer<typeof addReviewTargetInputSchema>

export type ReviewTargetAddition
  = | { readonly kind: "added", readonly targetId: string }
    | { readonly kind: "unavailable", readonly message: string }
