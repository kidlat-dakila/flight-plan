import { z } from "zod"
import { labelSegmentSchema } from "@/procedures/list-repositories/utils/schemas"

export const configurationRowSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  details: z.array(labelSegmentSchema),
  defaultLabel: z.string().nullable(),
  duplicateLabel: z.string(),
  duplicateName: z.string(),
})

export const configurationGroupSchema = z.strictObject({
  title: z.string(),
  rows: z.array(configurationRowSchema),
  emptyMessage: z.string().nullable(),
})

export const configurationListSchema = z.strictObject({ groups: z.array(configurationGroupSchema) })

export type ConfigurationRow = z.infer<typeof configurationRowSchema>
export type ConfigurationGroup = z.infer<typeof configurationGroupSchema>
export type ConfigurationList = z.infer<typeof configurationListSchema>
