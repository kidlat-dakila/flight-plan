import { Memo } from "@/core/memo"
import type { FileSearch, GitAdapter } from "@flightplan/git-forge"

export interface RepositorySnapshot {
  readonly commit: string
  readonly files: ReadonlySet<string>
  readonly read: (filePath: string) => Promise<string | null>
  readonly search: (search: FileSearch) => Promise<string[]>
}

export const readRepositorySnapshot = async (gitAdapter: GitAdapter, commit: string): Promise<RepositorySnapshot> => {
  const files = new Set(await gitAdapter.listFiles(commit))
  const texts = new Memo<string, Promise<string | null>>()
  const readBlob = async (filePath: string): Promise<string | null> => {
    try {
      return await gitAdapter.blob(filePath, commit)
    } catch {
      return null
    }
  }
  return {
    commit,
    files,
    read: async (filePath) => (files.has(filePath) ? await texts.remember(filePath, async () => await readBlob(filePath)) : null),
    search: async (search) => await gitAdapter.searchFiles(commit, search),
  }
}
