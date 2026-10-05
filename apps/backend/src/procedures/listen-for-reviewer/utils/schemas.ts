import { z } from "zod"

export const listenParamsSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
})

export const listenRejectionSchema = z.strictObject({ message: z.string() })

export type ListenParams = z.infer<typeof listenParamsSchema>
