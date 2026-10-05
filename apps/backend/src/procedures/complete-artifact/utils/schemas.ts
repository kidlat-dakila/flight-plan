import { z } from "zod"
import { reviewTargetShape } from "@/procedures/read-artifact/utils/schemas"
import type { Work } from "@/procedures/read-artifact/utils/unwritten-work"

export const completeArtifactInputShape = {
  ...reviewTargetShape,
  limit: z.number().int().positive().optional().describe("How many missing items to list on a refusal. Default 20."),
}

export const completeArtifactInputSchema = z.strictObject(completeArtifactInputShape)

export type CompleteArtifactInput = z.infer<typeof completeArtifactInputSchema>

export type ArtifactCompletion
  = | { readonly kind: "finished" }
    | { readonly kind: "unfinished", readonly missing: readonly Work[], readonly total: number, readonly remaining: number }
    | { readonly kind: "rejected", readonly message: string }
