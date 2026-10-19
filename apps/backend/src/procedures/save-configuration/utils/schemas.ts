import { z } from "zod"
import { CONTEXT_CODE_BLOCK_KINDS } from "@flightplan/configurations"

const writtenTextSchema = z.strictObject({ key: z.string(), text: z.string() })

export const saveConfigurationInputSchema = z.discriminatedUnion("change", [
  z.strictObject({ change: z.literal("field"), id: z.string(), path: z.string(), texts: z.array(writtenTextSchema) }),
  z.strictObject({ change: z.literal("reset"), id: z.string(), path: z.string() }),
  z.strictObject({
    change: z.literal("switches"),
    id: z.string(),
    contextCodeBlockKinds: z.array(z.enum(CONTEXT_CODE_BLOCK_KINDS)),
  }),
  z.strictObject({ change: z.literal("rename"), id: z.string(), name: z.string() }),
])

export const configurationSavingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved"), message: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type SaveConfigurationInput = z.infer<typeof saveConfigurationInputSchema>
export type ConfigurationSaving = z.infer<typeof configurationSavingSchema>
