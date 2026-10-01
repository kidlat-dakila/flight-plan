import { z } from "zod"

export const SETUP_PATH = "/setup"
export const HOME_PATH = "/"

export const getSetupGateInputSchema = z.strictObject({ path: z.string() })

export const setupGateSchema = z.strictObject({ redirectTo: z.enum([SETUP_PATH, HOME_PATH]).nullable() })

export type GetSetupGateInput = z.infer<typeof getSetupGateInputSchema>
export type SetupGate = z.infer<typeof setupGateSchema>
