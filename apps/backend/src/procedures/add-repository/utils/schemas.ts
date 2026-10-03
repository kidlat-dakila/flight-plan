import { z } from "zod"

export const authorSelectionShape = {
  selfAuthorId: z.string().nullable(),
  trackedAuthorIds: z.array(z.string()),
}

export const addRepositoryInputSchema = z.strictObject({ path: z.string(), ...authorSelectionShape })

export const addedRepositorySchema = z.strictObject({ name: z.string() })

export type AddRepositoryInput = z.infer<typeof addRepositoryInputSchema>
