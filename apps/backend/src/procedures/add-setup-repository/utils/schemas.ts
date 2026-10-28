import { z } from "zod"
import { authorSelectionShape } from "@/procedures/add-repository/utils/schemas"
import { baseBranchSelectionShape } from "@/procedures/set-base-branch/utils/schemas"

export const addSetupRepositoryInputSchema = z.strictObject({ path: z.string(), ...authorSelectionShape, ...baseBranchSelectionShape })

export const addedSetupRepositorySchema = z.strictObject({ name: z.string() })

export type AddSetupRepositoryInput = z.infer<typeof addSetupRepositoryInputSchema>
