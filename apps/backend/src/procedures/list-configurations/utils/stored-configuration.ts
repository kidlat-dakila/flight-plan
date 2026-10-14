import { z } from "zod"
import { CONTEXT_CODE_BLOCK_KINDS, PRESET_NAMES, SECTION_NAMES } from "@flightplan/configurations"
import type { SavedConfiguration } from "./configuration"

export const CONFIGURATION_FILE_NAME = "configuration.json"
export const INSTRUCTION_FILE_EXTENSION = ".md"

const JSON_INDENT = 2

export type ConfigurationFiles = ReadonlyMap<string, string>

export interface StoredFile {
  readonly folder: string
  readonly fileName: string
}

export interface WrittenFile extends StoredFile {
  readonly text: string
}

export interface ConfigurationFileChanges {
  readonly writtenFiles: readonly WrittenFile[]
  readonly removedFiles: readonly StoredFile[]
  readonly removedFolders: readonly string[]
}

const configurationFileSchema = z.strictObject({
  name: z.string(),
  preset: z.enum(PRESET_NAMES),
  sections: z.record(z.enum(SECTION_NAMES), z.boolean()),
  contextCodeBlockKinds: z.array(z.enum(CONTEXT_CODE_BLOCK_KINDS)),
})

const parseJson = (text: string | undefined): unknown => {
  if (text === undefined) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

const isInstructionFileName = (fileName: string): boolean => fileName.endsWith(INSTRUCTION_FILE_EXTENSION)

const instructionKeyOf = (fileName: string): string => fileName.slice(0, -INSTRUCTION_FILE_EXTENSION.length)

export const isStoredFileName = (fileName: string): boolean =>
  fileName === CONFIGURATION_FILE_NAME || isInstructionFileName(fileName)

export const formatConfigurationFiles = (configuration: SavedConfiguration): ConfigurationFiles => {
  const { name, preset, sections, contextCodeBlockKinds } = configuration
  return new Map([
    [CONFIGURATION_FILE_NAME, `${JSON.stringify({ name, preset, sections, contextCodeBlockKinds }, null, JSON_INDENT)}\n`],
    ...Object.entries(configuration.instructions).map(([key, text]) => [`${key}${INSTRUCTION_FILE_EXTENSION}`, text] as const),
  ])
}

export const parseConfigurationFiles = (id: string, files: ConfigurationFiles): SavedConfiguration | null => {
  const described = configurationFileSchema.safeParse(parseJson(files.get(CONFIGURATION_FILE_NAME)))
  if (!described.success) return null
  return {
    id,
    ...described.data,
    instructions: Object.fromEntries(
      [...files]
        .filter(([fileName]) => isInstructionFileName(fileName))
        .map(([fileName, text]) => [instructionKeyOf(fileName), text]),
    ),
  }
}

export const configurationFoldersOf = (
  folders: ReadonlyMap<string, ConfigurationFiles>,
): ReadonlyMap<string, ConfigurationFiles> =>
  new Map([...folders].filter(([id, files]) => parseConfigurationFiles(id, files) !== null))

export const storedConfigurationsOf = (folders: ReadonlyMap<string, ConfigurationFiles>): SavedConfiguration[] =>
  [...folders.keys()]
    .sort((one, two) => one.localeCompare(two))
    .flatMap((id) => {
      const configuration = parseConfigurationFiles(id, folders.get(id) ?? new Map())
      return configuration === null ? [] : [configuration]
    })

const writtenFilesOf = (
  folders: ReadonlyMap<string, ConfigurationFiles>,
  nextFolders: ReadonlyMap<string, ConfigurationFiles>,
): WrittenFile[] =>
  [...nextFolders].flatMap(([folder, files]) =>
    [...files]
      .filter(([fileName, text]) => folders.get(folder)?.get(fileName) !== text)
      .map(([fileName, text]) => ({ folder, fileName, text })),
  )

const removedFilesOf = (
  folders: ReadonlyMap<string, ConfigurationFiles>,
  nextFolders: ReadonlyMap<string, ConfigurationFiles>,
): StoredFile[] =>
  [...folders].flatMap(([folder, files]) => {
    const nextFiles = nextFolders.get(folder)
    return nextFiles === undefined
      ? []
      : [...files.keys()].filter((fileName) => !nextFiles.has(fileName)).map((fileName) => ({ folder, fileName }))
  })

export const planFileChanges = (
  folders: ReadonlyMap<string, ConfigurationFiles>,
  configurations: readonly SavedConfiguration[],
): ConfigurationFileChanges => {
  const storedFolders = configurationFoldersOf(folders)
  const nextFolders = new Map(configurations.map((configuration) => [configuration.id, formatConfigurationFiles(configuration)]))
  return {
    writtenFiles: writtenFilesOf(storedFolders, nextFolders),
    removedFiles: removedFilesOf(storedFolders, nextFolders),
    removedFolders: [...storedFolders.keys()].filter((folder) => !nextFolders.has(folder)),
  }
}
