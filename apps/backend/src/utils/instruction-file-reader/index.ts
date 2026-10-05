import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import type { InstructionReader, InstructionTexts } from "@/procedures/get-instructions/utils/instruction-texts"
import { DEFAULT_CONFIGURATIONS_FOLDER, SYSTEM_INSTRUCTIONS_FOLDER } from "@flightplan/configurations"

const INSTRUCTION_FILE_EXTENSION = ".md"

const readFolderTexts = async (folderPath: string): Promise<ReadonlyMap<string, string>> => {
  const fileNames = (await readdir(folderPath)).filter((name) => name.endsWith(INSTRUCTION_FILE_EXTENSION))
  const entries = await Promise.all(
    fileNames.map(async (name) => [
      name.slice(0, -INSTRUCTION_FILE_EXTENSION.length),
      await readFile(join(folderPath, name), "utf8"),
    ] as const),
  )
  return new Map(entries)
}

const readPresetTexts = async (presetsPath: string): Promise<InstructionTexts["presets"]> => {
  const folders = (await readdir(presetsPath, { withFileTypes: true })).filter((entry) => entry.isDirectory())
  const entries = await Promise.all(
    folders.map(async (folder) => [folder.name, await readFolderTexts(join(presetsPath, folder.name))] as const),
  )
  return new Map(entries)
}

const readInstructionTexts = async (configurationsPath: string): Promise<InstructionTexts> => {
  const [system, presets] = await Promise.all([
    readFolderTexts(join(configurationsPath, SYSTEM_INSTRUCTIONS_FOLDER)),
    readPresetTexts(join(configurationsPath, DEFAULT_CONFIGURATIONS_FOLDER)),
  ])
  return { system, presets }
}

export class InstructionFileReader {
  private readonly configurationsPath: string
  private texts: Promise<InstructionTexts> | null = null

  public constructor(configurationsPath: string) {
    this.configurationsPath = configurationsPath
  }

  public readonly read: InstructionReader = async () => {
    this.texts ??= readInstructionTexts(this.configurationsPath)
    try {
      return await this.texts
    } catch (error) {
      this.texts = null
      throw error
    }
  }
}
