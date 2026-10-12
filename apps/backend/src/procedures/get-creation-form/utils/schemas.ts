import { z } from "zod"
import { startFormSchema } from "@/procedures/get-review/utils/schemas"
import { AUTHOR_STARTS } from "@/procedures/get-review/utils/start/review-request"
import { targetOptionSchema } from "@/procedures/search-creation-targets/utils/schemas"

export const INITIALIZATION_KINDS = ["draft", "scaffold", "empty"] as const

export const getCreationFormInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string().nullable(),
})

export const creationFormSchema = z.strictObject({
  title: z.string(),
  description: z.string(),
  target: z.strictObject({
    label: z.string(),
    hint: z.string(),
    placeholder: z.string(),
    selected: targetOptionSchema.nullable(),
  }),
  initialization: z.strictObject({
    legend: z.string(),
    selectedKind: z.enum(INITIALIZATION_KINDS),
    options: z.array(
      z.strictObject({
        kind: z.enum(INITIALIZATION_KINDS),
        label: z.string(),
        description: z.string(),
        authorWriting: z.strictObject({ start: z.enum(AUTHOR_STARTS), submitLabel: z.string() }).nullable(),
      }),
    ),
  }),
  form: startFormSchema,
  pendingLabel: z.string(),
})

export type InitializationKind = (typeof INITIALIZATION_KINDS)[number]
export type GetCreationFormInput = z.infer<typeof getCreationFormInputSchema>
export type CreationForm = z.infer<typeof creationFormSchema>
