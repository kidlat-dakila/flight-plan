import type { RepositoryActivity } from "./repository-activity"

export const RECENT_REPOSITORY_LIMIT = 10

export interface FolderActivity {
  readonly path: string
  readonly activity: RepositoryActivity
}

const byMainWorktreeFirst = (first: FolderActivity, second: FolderActivity): number =>
  Number(second.activity.isMainWorktree) - Number(first.activity.isMainWorktree) || first.path.localeCompare(second.path)

const byLatestCommitFirst = (first: FolderActivity, second: FolderActivity): number =>
  second.activity.latestCommitAt.getTime() - first.activity.latestCommitAt.getTime()
  || first.path.localeCompare(second.path)

const keepOnePerGitFolder = (folders: readonly FolderActivity[]): readonly FolderActivity[] => {
  const preferredFolders = [...folders].sort(byMainWorktreeFirst)
  return preferredFolders.filter(
    (folder, index) =>
      preferredFolders.findIndex((other) => other.activity.gitFolderPath === folder.activity.gitFolderPath) === index,
  )
}

export const rankRecentRepositories = (folders: readonly FolderActivity[]): readonly FolderActivity[] =>
  [...keepOnePerGitFolder(folders)].sort(byLatestCommitFirst).slice(0, RECENT_REPOSITORY_LIMIT)
