import { z } from "zod"

export const importReviewInputSchema = z.strictObject({
  artifactUrl: z.string(),
  repositoryName: z.string(),
  targetId: z.string(),
})

export const reviewImportSchema = z.strictObject({ importId: z.string().nullable(), message: z.string() })

export type ImportReviewInput = z.infer<typeof importReviewInputSchema>
export type ReviewImport = z.infer<typeof reviewImportSchema>
