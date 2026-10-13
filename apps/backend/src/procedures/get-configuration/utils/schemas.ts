import { z } from "zod"
import { SWITCHABLE_SECTIONS } from "@/procedures/list-configurations/utils/configuration"
import { CONTEXT_CODE_BLOCK_KINDS } from "@flightplan/configurations"

export const ENTRY_MARKS = ["changed", "unchanged", "off"] as const

export const getConfigurationInputSchema = z.strictObject({ id: z.string(), field: z.string().nullable() })

export const indexEntrySchema = z.strictObject({
  key: z.string(),
  label: z.string(),
  mark: z.enum(ENTRY_MARKS),
  markLabel: z.string(),
  isOpen: z.boolean(),
})

export const groupSwitchSchema = z.strictObject({ section: z.enum(SWITCHABLE_SECTIONS), label: z.string(), isOn: z.boolean() })

export const indexGroupSchema = z.strictObject({
  title: z.string().nullable(),
  switch: groupSwitchSchema.nullable(),
  entries: z.array(indexEntrySchema),
})

export const sectionSwitchSchema = z.strictObject({
  section: z.enum(SWITCHABLE_SECTIONS),
  label: z.string(),
  description: z.string(),
  isOn: z.boolean(),
})

export const contextKindSwitchSchema = z.strictObject({
  kind: z.enum(CONTEXT_CODE_BLOCK_KINDS),
  label: z.string(),
  description: z.string(),
  isRequired: z.boolean(),
})

export const switchesPanelSchema = z.strictObject({
  kind: z.literal("switches"),
  title: z.string(),
  summary: z.string(),
  sectionsTitle: z.string(),
  sections: z.array(sectionSwitchSchema),
  alwaysWrittenNote: z.string(),
  contextKindsTitle: z.string(),
  contextKindsHint: z.string(),
  contextKinds: z.array(contextKindSwitchSchema),
})

export const instructionTextSchema = z.strictObject({
  key: z.string(),
  label: z.string(),
  value: z.string(),
  shippedValue: z.string(),
  shippedLabel: z.string(),
  isChanged: z.boolean(),
})

export const fieldPanelSchema = z.strictObject({
  kind: z.literal("field"),
  path: z.string(),
  title: z.string(),
  summary: z.string(),
  offMessage: z.string().nullable(),
  texts: z.array(instructionTextSchema),
  resetLabel: z.string().nullable(),
})

export const configurationPageSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("found"),
    id: z.string(),
    name: z.string(),
    originLabel: z.string(),
    notice: z.strictObject({ lead: z.string(), advice: z.string() }).nullable(),
    canRename: z.boolean(),
    canDelete: z.boolean(),
    duplicateLabel: z.string(),
    index: z.array(indexGroupSchema),
    panel: z.discriminatedUnion("kind", [switchesPanelSchema, fieldPanelSchema]),
  }),
  z.strictObject({ kind: z.literal("missing"), message: z.string() }),
])

export type GetConfigurationInput = z.infer<typeof getConfigurationInputSchema>
export type IndexEntry = z.infer<typeof indexEntrySchema>
export type IndexGroup = z.infer<typeof indexGroupSchema>
export type SwitchesPanel = z.infer<typeof switchesPanelSchema>
export type FieldPanel = z.infer<typeof fieldPanelSchema>
export type ConfigurationPage = z.infer<typeof configurationPageSchema>
