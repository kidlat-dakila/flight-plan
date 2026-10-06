import { FIELD_CONFIGURATIONS } from "./artifact/field-catalog"
import type { FieldConfiguration } from "./artifact/field-configuration"

export const SYSTEM_INSTRUCTIONS_FOLDER = "system-instructions"
export const DEFAULT_CONFIGURATIONS_FOLDER = "default-configurations"

export const PRESET_NAMES = ["standard", "minimal", "onboardee", "unfamiliar-territory"] as const

export type PresetName = (typeof PRESET_NAMES)[number]

export const BASE_PRESET_NAME: PresetName = "standard"

export const SECTION_NAMES = ["journey", "blast", "walkthrough"] as const

export type SectionName = (typeof SECTION_NAMES)[number]

export type SectionSwitches = Readonly<Record<SectionName, boolean>>

const ALL_SECTIONS_ON: SectionSwitches = { journey: true, blast: true, walkthrough: true }

export const PRESET_SECTIONS: Readonly<Record<PresetName, SectionSwitches>> = {
  "standard": ALL_SECTIONS_ON,
  "minimal": ALL_SECTIONS_ON,
  "onboardee": ALL_SECTIONS_ON,
  "unfamiliar-territory": ALL_SECTIONS_ON,
}

export interface InstructionField {
  readonly path: string
  readonly title: string
  readonly isEditable: boolean
  readonly options: readonly string[]
  readonly configuration: FieldConfiguration
}

const INSTRUCTION_FILE_EXTENSION = ".md"

const toInstructionField = (configuration: FieldConfiguration): InstructionField => ({
  path: configuration.fieldDescription.slice(0, -INSTRUCTION_FILE_EXTENSION.length),
  title: configuration.configurationType === "editable" ? configuration._ui.description : configuration.summary,
  isEditable: configuration.configurationType === "editable",
  options: Object.keys(configuration.values ?? {}),
  configuration,
})

export const INSTRUCTION_FIELDS: readonly InstructionField[] = FIELD_CONFIGURATIONS.map(toInstructionField)

export const instructionFileKey = (path: string, option: string | null = null): string =>
  option === null ? path : `${path}.${option}`

export const systemInstructionKeys = (): string[] => INSTRUCTION_FIELDS.map((field) => instructionFileKey(field.path))

export const presetInstructionKeys = (): string[] =>
  INSTRUCTION_FIELDS
    .filter((field) => field.isEditable)
    .flatMap((field) => [
      instructionFileKey(field.path),
      ...field.options.map((option) => instructionFileKey(field.path, option)),
    ])

export * from "./artifact/artifact-schema"
export * from "./artifact/field-catalog"
export * from "./artifact/field-configuration"
export * from "./artifact/kinds"
export type * from "./artifact/review-artifact"
export * from "./bands/band-schemas"
export * from "./bands/code-token"
