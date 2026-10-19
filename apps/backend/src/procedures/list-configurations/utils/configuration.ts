import type { InstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { presetKeysOf, presetTextOf } from "@/procedures/get-instructions/utils/resolve-instructions"
import { isPresetName } from "@/procedures/get-setup/utils/default-configuration"
import { PRESET_OFFERS } from "@/procedures/get-setup/utils/preset-catalog"
import { isContextCodeBlockField } from "@/procedures/read-artifact/utils/context-code-blocks"
import {
  INSTRUCTION_FIELDS,
  PRESET_CONTEXT_CODE_BLOCK_KINDS,
  PRESET_NAMES,
  type ContextCodeBlockKind,
  type InstructionField,
  type PresetName,
} from "@flightplan/configurations"
import { unwrapSoftBreaks } from "./unwrap-soft-breaks"

export interface SavedConfiguration {
  readonly id: string
  readonly name: string
  readonly preset: PresetName
  readonly contextCodeBlockKinds: readonly ContextCodeBlockKind[]
  readonly instructions: Readonly<Record<string, string>>
}

export interface Configuration extends SavedConfiguration {
  readonly isPreset: boolean
}

export const EDITABLE_FIELDS: readonly InstructionField[] = INSTRUCTION_FIELDS.filter((field) => field.isEditable)

export const shippedConfigurationOf = (preset: PresetName): Configuration => ({
  id: preset,
  name: PRESET_OFFERS[preset].label,
  preset,
  contextCodeBlockKinds: PRESET_CONTEXT_CODE_BLOCK_KINDS[preset],
  instructions: {},
  isPreset: true,
})

export const listConfigurationsOf = (saved: readonly SavedConfiguration[]): Configuration[] => [
  ...PRESET_NAMES.map((preset) => ({
    ...shippedConfigurationOf(preset),
    ...saved.find((configuration) => configuration.id === preset),
    isPreset: true,
  })),
  ...saved.filter((configuration) => !isPresetName(configuration.id)).map((configuration) => ({ ...configuration, isPreset: false })),
]

export const findConfiguration = (saved: readonly SavedConfiguration[], id: string): Configuration | null =>
  listConfigurationsOf(saved).find((configuration) => configuration.id === id) ?? null

export const toSaved = (configuration: Configuration): SavedConfiguration => ({
  id: configuration.id,
  name: configuration.name,
  preset: configuration.preset,
  contextCodeBlockKinds: configuration.contextCodeBlockKinds,
  instructions: configuration.instructions,
})

export const withSaved = (saved: readonly SavedConfiguration[], changed: Configuration): SavedConfiguration[] => [
  ...saved.filter((configuration) => configuration.id !== changed.id),
  toSaved(changed),
]

export const shippedTextOf = (texts: InstructionTexts, configuration: Configuration, key: string): string =>
  unwrapSoftBreaks(presetTextOf(texts, configuration.preset, key) ?? "")

export const writtenTextOf = (texts: InstructionTexts, configuration: Configuration, key: string): string =>
  configuration.instructions[key] ?? shippedTextOf(texts, configuration, key)

export const isKeyChanged = (texts: InstructionTexts, configuration: Configuration, key: string): boolean =>
  writtenTextOf(texts, configuration, key) !== shippedTextOf(texts, configuration, key)

export const isFieldChanged = (texts: InstructionTexts, configuration: Configuration, field: InstructionField): boolean =>
  presetKeysOf(field).some((key) => isKeyChanged(texts, configuration, key))

export const changedFieldsOf = (texts: InstructionTexts, configuration: Configuration): InstructionField[] =>
  EDITABLE_FIELDS.filter((field) => isFieldChanged(texts, configuration, field))

export const isFieldOff = (configuration: Configuration, path: string): boolean =>
  isContextCodeBlockField(path) && configuration.contextCodeBlockKinds.length === 0

const hasSameKinds = (kinds: readonly ContextCodeBlockKind[], otherKinds: readonly ContextCodeBlockKind[]): boolean =>
  kinds.length === otherKinds.length && kinds.every((kind) => otherKinds.includes(kind))

export const areContextKindsChanged = (configuration: Configuration): boolean =>
  !hasSameKinds(configuration.contextCodeBlockKinds, shippedConfigurationOf(configuration.preset).contextCodeBlockKinds)
