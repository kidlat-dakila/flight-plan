import { z } from "zod"

export const CREATION_FIELDS = ["name", "source"] as const

export const createConfigurationInputSchema = z.strictObject({ name: z.string().nullable(), sourceId: z.string() })

export const configurationCreationSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("created"), id: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string(), field: z.enum(CREATION_FIELDS) }),
])

export type CreateConfigurationInput = z.infer<typeof createConfigurationInputSchema>
export type ConfigurationCreation = z.infer<typeof configurationCreationSchema>
