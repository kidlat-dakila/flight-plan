import { z } from "zod"
import { logIdSchema, MAX_MESSAGE_LENGTH } from "@/procedures/record-error/utils/schemas"

export const troubleshootSubjectSchema = z.strictObject({
  errorLogId: logIdSchema.nullable(),
  shownError: z.string().max(MAX_MESSAGE_LENGTH).nullable(),
})

export const troubleshootFormSchema = z.strictObject({
  title: z.string(),
  intro: z.string(),
  error: z.strictObject({ label: z.string(), message: z.string() }).nullable(),
  description: z.strictObject({
    label: z.string(),
    placeholder: z.string(),
    isRequired: z.boolean(),
  }),
  privacyNote: z.string(),
  problem: z.string().nullable(),
  launchLabel: z.string(),
  cancelLabel: z.string(),
  closeLabel: z.string(),
  manual: z.strictObject({
    label: z.string(),
    copyLabel: z.string(),
    copiedMessage: z.string(),
  }),
})

export type TroubleshootSubject = z.infer<typeof troubleshootSubjectSchema>
export type TroubleshootForm = z.infer<typeof troubleshootFormSchema>
