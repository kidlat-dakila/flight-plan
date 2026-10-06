import { Memo } from "@/shared/memo"
import type { FileSearch, GitAdapter } from "@flightplan/git-forge"

export interface RepositorySnapshot {
  readonly commit: string
  readonly files: ReadonlySet<string>
  readonly read: (filePath: string) => Promise<string | null>
  readonly preload: (filePaths: readonly string[]) => Promise<void>
  readonly search: (search: FileSearch) => Promise<string[]>
}

const NO_TEXTS: ReadonlyMap<string, string> = new Map()

export const readRepositorySnapshot = async (gitAdapter: GitAdapter, commit: string): Promise<RepositorySnapshot> => {
  const files = new Set(await gitAdapter.listFiles(commit))
  const texts = new Memo<string, Promise<string | null>>()

  const readBlobs = async (filePaths: readonly string[]): Promise<ReadonlyMap<string, string>> => {
    try {
      return await gitAdapter.blobs(filePaths, commit)
    } catch {
      return NO_TEXTS
    }
  }

  const load = (filePaths: readonly string[]): void => {
    const unread = [...new Set(filePaths)].filter((filePath) => files.has(filePath) && !texts.has(filePath))
    if (unread.length === 0) return
    const reading = readBlobs(unread)
    unread.forEach((filePath) => {
      void texts.store(filePath, reading.then((found) => found.get(filePath) ?? null))
    })
  }

  const read = async (filePath: string): Promise<string | null> => {
    load([filePath])
    return (await texts.find(filePath)) ?? null
  }

  return {
    commit,
    files,
    read,
    preload: async (filePaths) => {
      load(filePaths)
      await Promise.all(filePaths.map(async (filePath) => await texts.find(filePath)))
    },
    search: async (search) => await gitAdapter.searchFiles(commit, search),
  }
}
