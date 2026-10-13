import { z } from "zod"

export const markCompleteInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  pullRequestTargetId: z.string().nullable(),
})

export const markCompleteResultSchema = z.strictObject({ message: z.string(), targetId: z.string() })

export type MarkCompleteInput = z.infer<typeof markCompleteInputSchema>
export type MarkCompleteResult = z.infer<typeof markCompleteResultSchema>
