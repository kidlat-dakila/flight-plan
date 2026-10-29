import { z } from "zod"
import { tracePageSchema } from "./trace-fixture-schemas"

export const playgroundEntrySchema = z.strictObject({
  id: z.string(),
  language: z.string(),
  framework: z.string(),
  title: z.string(),
})

export const playgroundEntriesSchema = z.array(playgroundEntrySchema)

export const playgroundCasePageSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  caseTitle: z.string(),
  page: tracePageSchema,
})

export const playgroundPageSchema = z.strictObject({
  entry: playgroundEntrySchema,
  cases: z.array(playgroundCasePageSchema),
})

export type PlaygroundEntry = z.infer<typeof playgroundEntrySchema>

export type PlaygroundCasePage = z.infer<typeof playgroundCasePageSchema>

export type PlaygroundPage = z.infer<typeof playgroundPageSchema>
