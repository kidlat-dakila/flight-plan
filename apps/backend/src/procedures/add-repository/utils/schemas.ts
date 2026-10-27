import { z } from "zod"
import { baseBranchSelectionShape } from "@/procedures/set-base-branch/utils/schemas"

export const authorSelectionShape = {
  trackedAuthorIds: z.array(z.string()),
}

export const addRepositoryInputSchema = z.strictObject({ path: z.string(), ...authorSelectionShape, ...baseBranchSelectionShape })

export const addedRepositorySchema = z.strictObject({ name: z.string() })

export type AddRepositoryInput = z.infer<typeof addRepositoryInputSchema>
