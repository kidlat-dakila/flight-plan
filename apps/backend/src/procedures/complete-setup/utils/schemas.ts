import { z } from "zod"
import { HOME_PATH } from "@/procedures/get-setup-gate/utils/schemas"

export const completeSetupInputSchema = z.strictObject({})

export const completedSetupSchema = z.strictObject({ redirectTo: z.literal(HOME_PATH) })

export type CompleteSetupInput = z.infer<typeof completeSetupInputSchema>
