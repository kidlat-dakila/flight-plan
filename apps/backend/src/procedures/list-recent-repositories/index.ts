import type { ProcedureContext } from "@/procedures/context"
import { addedRepositoryPaths } from "@/procedures/get-setup/utils/added-paths"
import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { buildRecentRepositories } from "./utils/build-recent-repositories"
import { rankRecentRepositories, type FolderActivity } from "./utils/rank-recent-repositories"
import type { ListRecentRepositoriesInput, RecentRepositories } from "./utils/schemas"

const readFolderActivity = async (path: string, environment: SetupEnvironment): Promise<FolderActivity | null> => {
  const identity = await environment.readGitIdentity(path)
  if (identity === null) return null
  const activity = await environment.readRepositoryActivity(path, identity.email)
  return activity === null ? null : { path, activity }
}

const isFolderActivity = (folder: FolderActivity | null): folder is FolderActivity => folder !== null

export const listRecentRepositories = async (
  _input: ListRecentRepositoriesInput,
  context: ProcedureContext,
): Promise<RecentRepositories> => {
  const [repositoryFolders, setup, listedRepositories] = await Promise.all([
    context.setupEnvironment.findRepositoryFolders(),
    context.setupStore.read(),
    context.repositoryStore.listRegistered(),
  ])
  const folders = await Promise.all(
    repositoryFolders.paths.map(async (path) => await readFolderActivity(path, context.setupEnvironment)),
  )
  const rankedFolders = rankRecentRepositories(folders.filter(isFolderActivity))
  return buildRecentRepositories(rankedFolders, addedRepositoryPaths(setup, listedRepositories))
}
