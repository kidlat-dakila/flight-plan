import { offSectionOfField } from "@/procedures/read-artifact/utils/artifact-sections"
import {
  BASE_PRESET_NAME,
  INSTRUCTION_FIELDS,
  instructionFileKey,
  type InstructionField,
  type PresetName,
  type SectionSwitches,
} from "@flightplan/configurations"
import type { InstructionTexts } from "./instruction-texts"

export interface IndexedField {
  readonly path: string
  readonly title: string
}

export interface InstructionIndex {
  readonly configuration: PresetName
  readonly sections: SectionSwitches
  readonly fields: readonly IndexedField[]
}

export interface ResolvedField {
  readonly path: string
  readonly kind: "editable" | "static"
  readonly description: string
  readonly instruction: string | null
  readonly options: Readonly<Record<string, string>> | null
}

export type FieldResolution
  = | { readonly kind: "resolved", readonly fields: readonly ResolvedField[] }
    | { readonly kind: "unknown", readonly paths: readonly string[], readonly nearPaths: readonly string[] }
    | { readonly kind: "incomplete", readonly keys: readonly string[] }

const PATH_SEPARATOR = "."

export const listFieldPaths = (sections: SectionSwitches): string[] =>
  INSTRUCTION_FIELDS.map((field) => field.path).filter((path) => offSectionOfField(path, sections) === null)

export const buildInstructionIndex = (preset: PresetName, sections: SectionSwitches): InstructionIndex => ({
  configuration: preset,
  sections,
  fields: INSTRUCTION_FIELDS
    .filter((field) => offSectionOfField(field.path, sections) === null)
    .map(({ path, title }) => ({ path, title })),
})

const presetTextOf = (texts: InstructionTexts, preset: PresetName, key: string): string | null =>
  texts.presets.get(preset)?.get(key) ?? texts.presets.get(BASE_PRESET_NAME)?.get(key) ?? null

const lastSegmentOf = (path: string): string => path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1)

const nearPathsOf = (unknownPaths: readonly string[]): string[] =>
  INSTRUCTION_FIELDS
    .map((field) => field.path)
    .filter((known) => unknownPaths.some((unknown) => lastSegmentOf(unknown) === lastSegmentOf(known)))

const presetKeysOf = (field: InstructionField): string[] =>
  field.isEditable
    ? [instructionFileKey(field.path), ...field.options.map((option) => instructionFileKey(field.path, option))]
    : []

const missingKeysOf = (field: InstructionField, texts: InstructionTexts, preset: PresetName): string[] => [
  ...(texts.system.has(instructionFileKey(field.path)) ? [] : [instructionFileKey(field.path)]),
  ...presetKeysOf(field).filter((key) => presetTextOf(texts, preset, key) === null),
]

const optionsOf = (field: InstructionField, texts: InstructionTexts, preset: PresetName): ResolvedField["options"] =>
  field.options.length === 0
    ? null
    : Object.fromEntries(
        field.options.map((option) => [option, presetTextOf(texts, preset, instructionFileKey(field.path, option)) ?? ""]),
      )

const resolveField = (field: InstructionField, texts: InstructionTexts, preset: PresetName): ResolvedField => ({
  path: field.path,
  kind: field.isEditable ? "editable" : "static",
  description: texts.system.get(instructionFileKey(field.path)) ?? "",
  instruction: field.isEditable ? presetTextOf(texts, preset, instructionFileKey(field.path)) : null,
  options: optionsOf(field, texts, preset),
})

export const resolveFields = (
  paths: readonly string[] | null,
  texts: InstructionTexts,
  preset: PresetName,
): FieldResolution => {
  const wantedPaths = paths ?? INSTRUCTION_FIELDS.map((field) => field.path)
  const unknownPaths = wantedPaths.filter((path) => INSTRUCTION_FIELDS.every((field) => field.path !== path))
  if (unknownPaths.length > 0) return { kind: "unknown", paths: unknownPaths, nearPaths: nearPathsOf(unknownPaths) }
  const fields = wantedPaths.flatMap((path) => INSTRUCTION_FIELDS.filter((field) => field.path === path))
  const missingKeys = fields.flatMap((field) => missingKeysOf(field, texts, preset))
  return missingKeys.length > 0
    ? { kind: "incomplete", keys: missingKeys }
    : { kind: "resolved", fields: fields.map((field) => resolveField(field, texts, preset)) }
}
