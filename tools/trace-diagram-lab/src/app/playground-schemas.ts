import { z } from "zod"
import { tracePageSchema } from "./trace-fixture-schemas"

export const playgroundEntrySchema = z.strictObject({
  id: z.string(),
  language: z.string(),
  framework: z.string(),
  title: z.string(),
  caseTitle: z.string(),
})

export const playgroundEntriesSchema = z.array(playgroundEntrySchema)

export const playgroundPageSchema = z.strictObject({
  entry: playgroundEntrySchema,
  page: tracePageSchema,
})

export type PlaygroundEntry = z.infer<typeof playgroundEntrySchema>

export type PlaygroundPage = z.infer<typeof playgroundPageSchema>
