import { z } from "zod"

export const removeRepositoryInputSchema = z.strictObject({ name: z.string() })

export const removedRepositorySchema = z.strictObject({ name: z.string() })

export type RemoveRepositoryInput = z.infer<typeof removeRepositoryInputSchema>
