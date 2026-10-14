import { readdir, readFile, rm } from "node:fs/promises"
import { join } from "node:path"
import type { SavedConfiguration } from "@/procedures/list-configurations/utils/configuration"
import type { ConfigurationStore } from "@/procedures/list-configurations/utils/configuration-store"
import {
  isStoredFileName,
  planFileChanges,
  storedConfigurationsOf,
  type ConfigurationFiles,
  type StoredFile,
} from "@/procedures/list-configurations/utils/stored-configuration"
import { removeFile, writeText } from "@/utils/text-file"

const CONFIGURATIONS_FOLDER_NAME = "configurations"
const MISSING_FOLDER_CODE = "ENOENT"

const isMissingFolder = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === MISSING_FOLDER_CODE

const readFolderNames = async (path: string): Promise<readonly string[]> => {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch (error) {
    if (isMissingFolder(error)) return []
    throw error
  }
}

const readConfigurationFiles = async (folderPath: string): Promise<ConfigurationFiles> => {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const fileNames = entries.filter((entry) => entry.isFile() && isStoredFileName(entry.name)).map((entry) => entry.name)
  return new Map(
    await Promise.all(fileNames.map(async (fileName) => [fileName, await readFile(join(folderPath, fileName), "utf8")] as const)),
  )
}

export class FileConfigurationStore implements ConfigurationStore {
  private readonly rootPath: string

  public constructor(dataPath: string) {
    this.rootPath = join(dataPath, CONFIGURATIONS_FOLDER_NAME)
  }

  public readonly read = async (): Promise<readonly SavedConfiguration[]> => storedConfigurationsOf(await this.readFolders())

  public readonly write = async (configurations: readonly SavedConfiguration[]): Promise<void> => {
    const changes = planFileChanges(await this.readFolders(), configurations)
    await Promise.all(changes.writtenFiles.map(async (file) => {
      await writeText(this.pathOf(file), file.text)
    }))
    await Promise.all(changes.removedFiles.map(async (file) => {
      await removeFile(this.pathOf(file))
    }))
    await Promise.all(changes.removedFolders.map(async (folder) => {
      await rm(join(this.rootPath, folder), { recursive: true, force: true })
    }))
  }

  private readonly readFolders = async (): Promise<ReadonlyMap<string, ConfigurationFiles>> => {
    const folders = await readFolderNames(this.rootPath)
    return new Map(
      await Promise.all(folders.map(async (folder) => [folder, await readConfigurationFiles(join(this.rootPath, folder))] as const)),
    )
  }

  private readonly pathOf = (file: StoredFile): string => join(this.rootPath, file.folder, file.fileName)
}
