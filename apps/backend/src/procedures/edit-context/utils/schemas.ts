import { z } from "zod"

export const editContextInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  segmentId: z.string(),
  context: z.string(),
})

export const contextEditingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("saved") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type EditContextInput = z.infer<typeof editContextInputSchema>
export type ContextEditing = z.infer<typeof contextEditingSchema>
