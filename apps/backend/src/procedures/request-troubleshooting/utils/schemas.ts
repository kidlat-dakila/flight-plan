import { z } from "zod"
import { troubleshootSubjectSchema } from "@/procedures/get-troubleshoot-form/utils/schemas"
import { pageSchema } from "@/procedures/record-error/utils/schemas"

const MAX_DESCRIPTION_LENGTH = 4000

export const requestTroubleshootingInputSchema = troubleshootSubjectSchema.extend({
  description: z.string().trim().max(MAX_DESCRIPTION_LENGTH),
  page: pageSchema,
})

export const troubleshootingOpeningSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("opened"), message: z.string() }),
  z.strictObject({ kind: z.literal("manual"), message: z.string(), command: z.string() }),
  z.strictObject({ kind: z.literal("rejected"), message: z.string(), field: z.literal("description").nullable() }),
])

export type RequestTroubleshootingInput = z.infer<typeof requestTroubleshootingInputSchema>
export type TroubleshootingOpening = z.infer<typeof troubleshootingOpeningSchema>
