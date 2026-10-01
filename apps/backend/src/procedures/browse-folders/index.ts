import type { ProcedureContext } from "@/procedures/context"
import { addedRepositoryPaths } from "@/procedures/get-setup/utils/added-paths"
import { buildFolderBrowser } from "./utils/build-folder-browser"
import type { BrowseFoldersInput, FolderBrowser } from "./utils/schemas"

export const browseFolders = async (input: BrowseFoldersInput, context: ProcedureContext): Promise<FolderBrowser | null> => {
  const [listing, setup, listedRepositories] = await Promise.all([
    context.setupEnvironment.listFolders(input.path),
    context.setupStore.read(),
    context.repositoryStore.list(),
  ])
  return listing === null ? null : buildFolderBrowser(listing, addedRepositoryPaths(setup, listedRepositories))
}
