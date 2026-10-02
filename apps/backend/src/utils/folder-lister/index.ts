import { readdir, stat } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import type { FolderEntry, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"

const GIT_FOLDER_NAME = ".git"

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export const isFolder = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export const readFolderEntries: SetupEnvironment["readFolderEntries"] = async (path) => {
  try {
    return [...(await readdir(path))].sort()
  } catch {
    return null
  }
}

const readFolderNames = async (path: string): Promise<readonly string[] | null> => {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return null
  }
}

const parentPathOf = (path: string): string | null => (dirname(path) === path ? null : dirname(path))

export const isRepositoryFolder: SetupEnvironment["isRepositoryFolder"] = async (path) =>
  await exists(join(path, GIT_FOLDER_NAME))

const toFolderEntry = async (parentPath: string, name: string): Promise<FolderEntry> => {
  const path = join(parentPath, name)
  return { name, path, isRepository: await isRepositoryFolder(path) }
}

export const createFolderLister = (homePath: string): SetupEnvironment["listFolders"] =>
  async (requestedPath) => {
    const path = resolve(requestedPath ?? homePath)
    const names = await readFolderNames(path)
    if (names === null) return null
    const folders = await Promise.all(names.map(async (name) => await toFolderEntry(path, name)))
    return { path, parentPath: parentPathOf(path), folders }
  }
