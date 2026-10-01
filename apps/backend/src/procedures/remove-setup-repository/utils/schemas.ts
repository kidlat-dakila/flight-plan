import { z } from "zod"

export const removeSetupRepositoryInputSchema = z.strictObject({ name: z.string() })

export const removedSetupRepositorySchema = z.strictObject({ name: z.string() })

export type RemoveSetupRepositoryInput = z.infer<typeof removeSetupRepositoryInputSchema>
