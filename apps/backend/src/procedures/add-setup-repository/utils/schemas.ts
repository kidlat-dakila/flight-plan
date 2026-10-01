import { z } from "zod"

export const addSetupRepositoryInputSchema = z.strictObject({ path: z.string() })

export const addedSetupRepositorySchema = z.strictObject({ name: z.string() })

export type AddSetupRepositoryInput = z.infer<typeof addSetupRepositoryInputSchema>
