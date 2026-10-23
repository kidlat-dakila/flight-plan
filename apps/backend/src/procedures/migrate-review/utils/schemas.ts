import { z } from "zod"

export const migrateReviewInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
})

export const reviewMigrationSchema = z.strictObject({ message: z.string() })

export type MigrateReviewInput = z.infer<typeof migrateReviewInputSchema>
export type ReviewMigration = z.infer<typeof reviewMigrationSchema>
