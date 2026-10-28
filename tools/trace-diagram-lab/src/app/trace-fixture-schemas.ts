import { z } from "zod"
import { codeDefinitionSchema, codeLinkSchema, traceBandSchema } from "@flightplan/configurations"

export const traceFixtureEntrySchema = z.strictObject({
  id: z.string(),
  source: z.string(),
  kind: z.string(),
  name: z.string(),
  title: z.string(),
})

export const traceFixtureEntriesSchema = z.array(traceFixtureEntrySchema)

export const tracePageSegmentSchema = z.strictObject({
  id: z.string(),
  heading: z.string().nullable(),
  traceDiagram: traceBandSchema,
})

export const tracePageSchema = z.strictObject({
  segments: z.array(tracePageSegmentSchema),
  codeLinks: z.record(z.string(), codeLinkSchema),
  codeDefinitions: z.record(z.string(), codeDefinitionSchema),
})

export const traceFixturePageSchema = z.strictObject({
  entry: traceFixtureEntrySchema,
  page: tracePageSchema,
})

export const failureBodySchema = z.object({ message: z.string() })

export type TraceFixtureEntry = z.infer<typeof traceFixtureEntrySchema>

export type TracePageSegment = z.infer<typeof tracePageSegmentSchema>

export type TracePage = z.infer<typeof tracePageSchema>

export type TraceFixturePage = z.infer<typeof traceFixturePageSchema>
