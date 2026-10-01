import { z } from "zod"

export const dismissNewTargetInputSchema = z.strictObject({ repositoryName: z.string(), targetId: z.string() })

export const dismissedNewTargetSchema = z.strictObject({ targetId: z.string() })

export type DismissNewTargetInput = z.infer<typeof dismissNewTargetInputSchema>
