import { z } from "zod"

export const chooseModelInputSchema = z.strictObject({
  repositoryName: z.string().min(1),
  targetId: z.string().min(1),
  model: z.string().min(1),
})

export const modelChoosingSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("chosen") }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string() }),
])

export type ChooseModelInput = z.infer<typeof chooseModelInputSchema>
export type ModelChoosing = z.infer<typeof modelChoosingSchema>
