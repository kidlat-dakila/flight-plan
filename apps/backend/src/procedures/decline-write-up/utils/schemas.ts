import { z } from "zod"

export const declineWriteUpInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
})

export const declineWriteUpResultSchema = z.strictObject({ kind: z.literal("declined") })

export type DeclineWriteUpInput = z.infer<typeof declineWriteUpInputSchema>
export type DeclineWriteUpResult = z.infer<typeof declineWriteUpResultSchema>
