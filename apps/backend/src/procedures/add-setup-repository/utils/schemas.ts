import { z } from "zod"
import { authorSelectionShape } from "@/procedures/add-repository/utils/schemas"

export const addSetupRepositoryInputSchema = z.strictObject({ path: z.string(), ...authorSelectionShape })

export const addedSetupRepositorySchema = z.strictObject({ name: z.string() })

export type AddSetupRepositoryInput = z.infer<typeof addSetupRepositoryInputSchema>
