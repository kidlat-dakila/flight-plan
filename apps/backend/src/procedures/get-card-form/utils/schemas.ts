import { z } from "zod"
import { CODE_BLOCK_TYPES } from "@flightplan/configurations"

export const getCardFormInputSchema = z.strictObject({
  repositoryName: z.string(),
  targetId: z.string(),
  segmentId: z.string(),
  nodeId: z.string(),
})

const kindSchema = z.enum(CODE_BLOCK_TYPES)

export const cardFormRowSchema = z.strictObject({
  id: z.string(),
  type: kindSchema,
  label: z.string(),
  name: z.string(),
  lineStart: z.number().int(),
  lineEnd: z.number().int(),
})

export const cardFormSchema = z.strictObject({
  nodeId: z.string(),
  title: z.string(),
  path: z.string(),
  lineStart: z.number().int(),
  lineEnd: z.number().int(),
  label: z.string(),
  labelPlaceholder: z.string(),
  description: z.string(),
  rows: z.array(cardFormRowSchema),
  kindOptions: z.array(z.strictObject({ value: kindSchema, label: z.string() })),
  defaultKind: kindSchema,
  waypoints: z.array(
    z.strictObject({
      id: z.string(),
      title: z.string(),
      lineStart: z.number().int(),
      lineEnd: z.number().int(),
      coreChangeLabel: z.string().nullable(),
    }),
  ),
})

export type GetCardFormInput = z.infer<typeof getCardFormInputSchema>
export type CardFormRow = z.infer<typeof cardFormRowSchema>
export type CardForm = z.infer<typeof cardFormSchema>
