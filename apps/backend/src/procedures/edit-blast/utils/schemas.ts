import { z } from "zod"
import { BLAST_IMPACT_CHOICES } from "@flightplan/configurations"

export const editBlastInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  path: z.string(),
  impactType: z.enum(BLAST_IMPACT_CHOICES),
  impactReason: z.string(),
})

export const blastEditingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type EditBlastInput = z.infer<typeof editBlastInputSchema>
export type BlastEditing = z.infer<typeof blastEditingSchema>
