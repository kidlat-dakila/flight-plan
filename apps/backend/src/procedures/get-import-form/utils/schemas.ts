import { z } from "zod"
import { importReviewInputSchema } from "@/procedures/import-review/utils/schemas"

export const getImportFormInputSchema = importReviewInputSchema

export const importFormSchema = z.strictObject({
  heading: z.string(),
  message: z.string(),
  details: z.array(z.strictObject({ label: z.string(), value: z.string() })),
  warning: z.string().nullable(),
  startsAtOnce: z.boolean(),
  isImporting: z.boolean(),
  isFinished: z.boolean(),
  importId: z.string().nullable(),
  submitLabel: z.string().nullable(),
  pendingLabel: z.string(),
  reviewHref: z.string().nullable(),
})

export type GetImportFormInput = z.infer<typeof getImportFormInputSchema>
export type ImportForm = z.infer<typeof importFormSchema>
