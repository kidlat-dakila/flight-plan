import { DEFAULT_CONFIGURATIONS_FOLDER, INSTRUCTION_FIELDS, instructionFileKey, PRESET_NAMES, presetInstructionKeys, SYSTEM_INSTRUCTIONS_FOLDER } from "@flightplan/configurations"

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

const INSTRUCTION_PATH_PATTERN = /([^/]*)\/([^/]+)\/([^/]+)\.md$/

interface InstructionFile {
  readonly folder: string
  readonly parentFolder: string
  readonly key: string
  readonly text: string
}

const instructionFileOf = ([path, text]: readonly [string, string]): InstructionFile[] => {
  const match = INSTRUCTION_PATH_PATTERN.exec(path)
  return match === null ? [] : [{ parentFolder: match[1], folder: match[2], key: match[3], text }]
}

const textsByKey = (files: readonly InstructionFile[]): ReadonlyMap<string, string> =>
  new Map(files.map((file) => [file.key, file.text]))

const presetTextsOf = (files: readonly InstructionFile[]): InstructionTexts["presets"] => {
  const presetFiles = files.filter((file) => file.parentFolder === DEFAULT_CONFIGURATIONS_FOLDER)
  const presetNames = [...new Set(presetFiles.map((file) => file.folder))]
  return new Map(presetNames.map((preset) => [preset, textsByKey(presetFiles.filter((file) => file.folder === preset))]))
}

export const instructionTextsOf = (textsByPath: Readonly<Record<string, string>>): InstructionTexts => {
  const files = Object.entries(textsByPath).flatMap(instructionFileOf)
  return {
    system: textsByKey(files.filter((file) => file.folder === SYSTEM_INSTRUCTIONS_FOLDER)),
    presets: presetTextsOf(files),
  }
}

export const instructionReaderOf = (texts: InstructionTexts): InstructionReader => async () => await Promise.resolve(texts)
