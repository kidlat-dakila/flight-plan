import { z } from "zod"

export const searchAddableTargetsInputSchema = z.strictObject({
  repositoryName: z.string(),
  query: z.string(),
})

export type SearchAddableTargetsInput = z.infer<typeof searchAddableTargetsInputSchema>
