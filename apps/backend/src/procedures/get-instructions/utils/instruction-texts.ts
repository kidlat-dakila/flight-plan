import { INSTRUCTION_FIELDS, instructionFileKey, PRESET_NAMES, presetInstructionKeys } from "@flightplan/configurations"

export interface InstructionTexts {
  readonly system: ReadonlyMap<string, string>
  readonly presets: ReadonlyMap<string, ReadonlyMap<string, string>>
}

export type InstructionReader = () => Promise<InstructionTexts>

export const createSampleInstructionTexts = (): InstructionTexts => ({
  system: new Map(
    INSTRUCTION_FIELDS.map((field) => [instructionFileKey(field.path), `What ${field.path} is.`]),
  ),
  presets: new Map(
    PRESET_NAMES.map((preset) => [
      preset,
      new Map(presetInstructionKeys().map((key) => [key, `How ${preset} writes ${key}.`])),
    ]),
  ),
})

export const readSampleInstructionTexts: InstructionReader = async () => await Promise.resolve(createSampleInstructionTexts())
