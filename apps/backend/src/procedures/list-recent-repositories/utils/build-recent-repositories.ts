import { basename } from "node:path"
import { addedLabelOf, type AddedPaths } from "@/procedures/get-setup/utils/added-paths"
import { formatRelativeTime } from "@/procedures/list-repositories/utils/format-relative-time"
import type { FolderActivity } from "./rank-recent-repositories"
import type { RecentRepositories } from "./schemas"

export const NO_RECENT_REPOSITORY_MESSAGE = "No repository in your home folder has a commit from you on main or master."

const toRecentRepository = (
  { path, activity }: FolderActivity,
  addedPaths: AddedPaths,
  now: Date,
): RecentRepositories["repositories"][number] => {
  const stateLabel = addedLabelOf(path, addedPaths)
  return {
    path,
    name: basename(path),
    branch: activity.branch,
    latestCommitAt: activity.latestCommitAt.toISOString(),
    latestCommitLabel: formatRelativeTime(activity.latestCommitAt, now),
    isAdded: stateLabel !== null,
    stateLabel,
  }
}

export const buildRecentRepositories = (
  rankedFolders: readonly FolderActivity[],
  addedPaths: AddedPaths,
  now: Date,
): RecentRepositories => ({
  repositories: rankedFolders.map((folder) => toRecentRepository(folder, addedPaths, now)),
  message: rankedFolders.length === 0 ? NO_RECENT_REPOSITORY_MESSAGE : null,
})
