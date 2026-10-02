import { readdir } from "node:fs/promises"
import { join } from "node:path"
import type { RepositoryFolderIndex, SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { isRepositoryFolder } from "@/utils/folder-lister"

export const MAX_SCAN_DEPTH = 6
export const REPOSITORY_CACHE_MS = 60_000

const HIDDEN_FOLDER_PREFIX = "."
const SKIPPED_FOLDER_NAMES: ReadonlySet<string> = new Set(["node_modules", "Library", "Applications", "AppData"])

export interface RepositoryFolderFinderOptions {
  readonly rootPath: string
  readonly now: () => Date
}

const isScannableFolderName = (name: string): boolean =>
  !name.startsWith(HIDDEN_FOLDER_PREFIX) && !SKIPPED_FOLDER_NAMES.has(name)

const readSubfolderNames = async (path: string): Promise<readonly string[]> => {
  try {
    const entries = await readdir(path, { withFileTypes: true })
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    return []
  }
}

const findRepositoriesBelow = async (folderPath: string, depthLeft: number): Promise<readonly string[]> => {
  if (depthLeft === 0) return []
  const subfolderNames = await readSubfolderNames(folderPath)
  const subfolderPaths = subfolderNames.filter(isScannableFolderName).map((name) => join(folderPath, name))
  const repositoryPathsBySubfolder = await Promise.all(
    subfolderPaths.map(async (subfolderPath) =>
      (await isRepositoryFolder(subfolderPath))
        ? [subfolderPath]
        : await findRepositoriesBelow(subfolderPath, depthLeft - 1)),
  )
  return repositoryPathsBySubfolder.flat()
}

interface CachedIndex {
  readonly foundAtMs: number
  readonly index: Promise<RepositoryFolderIndex>
}

class RepositoryFolderFinder {
  private cached: CachedIndex | null = null
  private readonly options: RepositoryFolderFinderOptions

  public constructor(options: RepositoryFolderFinderOptions) {
    this.options = options
  }

  public readonly find = async (): Promise<RepositoryFolderIndex> => {
    const nowMs = this.options.now().getTime()
    if (this.cached !== null && nowMs - this.cached.foundAtMs < REPOSITORY_CACHE_MS) return await this.cached.index
    const index = findRepositoriesBelow(this.options.rootPath, MAX_SCAN_DEPTH).then((paths) => ({
      rootPath: this.options.rootPath,
      paths,
    }))
    this.cached = { foundAtMs: nowMs, index }
    return await index
  }
}

export const createRepositoryFolderFinder = (
  options: RepositoryFolderFinderOptions,
): SetupEnvironment["findRepositoryFolders"] => new RepositoryFolderFinder(options).find
