import { z } from "zod"
import { SECTION_NAMES } from "@flightplan/configurations"

export const generateSectionInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  section: z.enum(SECTION_NAMES),
})

export const generateSectionResultSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("generated"), prompt: z.string().nullable(), message: z.string() }),
  z.strictObject({ kind: z.literal("unavailable"), message: z.string() }),
])

export type GenerateSectionInput = z.infer<typeof generateSectionInputSchema>
export type GenerateSectionResult = z.infer<typeof generateSectionResultSchema>
