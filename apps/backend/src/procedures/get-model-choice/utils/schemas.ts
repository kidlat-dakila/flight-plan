import { z } from "zod"

export const modelChoiceViewSchema = z.strictObject({
  label: z.string(),
  hint: z.string(),
  selectedModel: z.string(),
  options: z.array(z.strictObject({ value: z.string(), label: z.string() })),
})

export type ModelChoiceView = z.infer<typeof modelChoiceViewSchema>
