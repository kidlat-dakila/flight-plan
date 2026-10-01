import { z } from "zod"

export const addRepositoryInputSchema = z.strictObject({ path: z.string() })

export const addedRepositorySchema = z.strictObject({ name: z.string() })

export type AddRepositoryInput = z.infer<typeof addRepositoryInputSchema>
