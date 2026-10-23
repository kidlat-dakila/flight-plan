import { z } from "zod"
import { errorEntrySchema, logIdSchema, troubleshootRequestSchema } from "@/procedures/record-error/utils/schemas"

export const readTroubleshootRequestInputShape = {
  logId: logIdSchema.describe("The id after /flightplan:troubleshoot: a troubleshoot request, or one error log."),
}

export const readTroubleshootRequestInputSchema = z.strictObject(readTroubleshootRequestInputShape)

export const troubleshootReportSchema = z.strictObject({
  request: troubleshootRequestSchema.nullable(),
  error: errorEntrySchema.nullable(),
  recentErrors: z.array(errorEntrySchema),
  logsFolder: z.string(),
  flightPlan: z.strictObject({
    version: z.string().nullable(),
    sourceUrl: z.string(),
    docsUrl: z.string(),
    rawDocsUrl: z.string(),
  }),
  issue: z.strictObject({
    newIssueUrl: z.string(),
    maxUrlLength: z.number(),
  }),
})

export type ReadTroubleshootRequestInput = z.infer<typeof readTroubleshootRequestInputSchema>
export type TroubleshootReport = z.infer<typeof troubleshootReportSchema>
export type TroubleshootReading
  = | { readonly kind: "read", readonly report: TroubleshootReport }
    | { readonly kind: "rejected", readonly message: string }
