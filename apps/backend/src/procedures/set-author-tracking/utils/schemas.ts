import { z } from "zod"

export const setAuthorTrackingInputSchema = z.strictObject({
  repositoryName: z.string(),
  authorId: z.string(),
  isTracked: z.boolean(),
})

export const authorTrackingSchema = z.strictObject({ authorId: z.string() })

export type SetAuthorTrackingInput = z.infer<typeof setAuthorTrackingInputSchema>
