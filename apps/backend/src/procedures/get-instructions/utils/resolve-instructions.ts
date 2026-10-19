import { isContextCodeBlockField } from "@/procedures/read-artifact/utils/context-code-blocks"
import {
  BASE_PRESET_NAME,
  INSTRUCTION_FIELDS,
  instructionFileKey,
  type InstructionField,
  type PresetName,
} from "@flightplan/configurations"
import type { InstructionTexts } from "./instruction-texts"

export interface IndexedField {
  readonly path: string
  readonly title: string
}

export interface WrittenParts {
  readonly requiresContextCodeBlocks: boolean
}

export interface InstructionSource {
  readonly id: string
  readonly preset: PresetName
  readonly instructions: Readonly<Record<string, string>>
}

export interface InstructionIndex {
  readonly configuration: string
  readonly requiresContextCodeBlocks: boolean
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

const isWritten = (path: string, { requiresContextCodeBlocks }: WrittenParts): boolean =>
  requiresContextCodeBlocks || !isContextCodeBlockField(path)

export const listFieldPaths = (written: WrittenParts): string[] =>
  INSTRUCTION_FIELDS.map((field) => field.path).filter((path) => isWritten(path, written))

export const buildInstructionIndex = (configurationId: string, written: WrittenParts): InstructionIndex => ({
  configuration: configurationId,
  requiresContextCodeBlocks: written.requiresContextCodeBlocks,
  fields: INSTRUCTION_FIELDS
    .filter((field) => isWritten(field.path, written))
    .map(({ path, title }) => ({ path, title })),
})

export const presetTextOf = (texts: InstructionTexts, preset: PresetName, key: string): string | null =>
  texts.presets.get(preset)?.get(key) ?? texts.presets.get(BASE_PRESET_NAME)?.get(key) ?? null

const configuredTextOf = (texts: InstructionTexts, source: InstructionSource, key: string): string | null =>
  source.instructions[key] ?? presetTextOf(texts, source.preset, key)

const lastSegmentOf = (path: string): string => path.slice(path.lastIndexOf(PATH_SEPARATOR) + 1)

const nearPathsOf = (unknownPaths: readonly string[]): string[] =>
  INSTRUCTION_FIELDS
    .map((field) => field.path)
    .filter((known) => unknownPaths.some((unknown) => lastSegmentOf(unknown) === lastSegmentOf(known)))

export const presetKeysOf = (field: InstructionField): string[] =>
  field.isEditable
    ? [instructionFileKey(field.path), ...field.options.map((option) => instructionFileKey(field.path, option))]
    : []

const missingKeysOf = (field: InstructionField, texts: InstructionTexts, source: InstructionSource): string[] => [
  ...(texts.system.has(instructionFileKey(field.path)) ? [] : [instructionFileKey(field.path)]),
  ...presetKeysOf(field).filter((key) => configuredTextOf(texts, source, key) === null),
]

const optionsOf = (field: InstructionField, texts: InstructionTexts, source: InstructionSource): ResolvedField["options"] =>
  field.options.length === 0
    ? null
    : Object.fromEntries(
        field.options.map((option) => [option, configuredTextOf(texts, source, instructionFileKey(field.path, option)) ?? ""]),
      )

const resolveField = (field: InstructionField, texts: InstructionTexts, source: InstructionSource): ResolvedField => ({
  path: field.path,
  kind: field.isEditable ? "editable" : "static",
  description: texts.system.get(instructionFileKey(field.path)) ?? "",
  instruction: field.isEditable ? configuredTextOf(texts, source, instructionFileKey(field.path)) : null,
  options: optionsOf(field, texts, source),
})

export const resolveFields = (
  paths: readonly string[] | null,
  texts: InstructionTexts,
  source: InstructionSource,
): FieldResolution => {
  const wantedPaths = paths ?? INSTRUCTION_FIELDS.map((field) => field.path)
  const unknownPaths = wantedPaths.filter((path) => INSTRUCTION_FIELDS.every((field) => field.path !== path))
  if (unknownPaths.length > 0) return { kind: "unknown", paths: unknownPaths, nearPaths: nearPathsOf(unknownPaths) }
  const fields = wantedPaths.flatMap((path) => INSTRUCTION_FIELDS.filter((field) => field.path === path))
  const missingKeys = fields.flatMap((field) => missingKeysOf(field, texts, source))
  return missingKeys.length > 0
    ? { kind: "incomplete", keys: missingKeys }
    : { kind: "resolved", fields: fields.map((field) => resolveField(field, texts, source)) }
}
