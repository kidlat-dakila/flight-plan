import type { ProcedureContext } from "@/procedures/context"
import { addedRepositoryPaths } from "@/procedures/get-setup/utils/added-paths"
import type { FolderListing } from "@/procedures/get-setup/utils/setup-environment"
import { buildFolderBrowser } from "./utils/build-folder-browser"
import type { BrowseFoldersInput, FolderBrowser } from "./utils/schemas"

const HOME_FOLDER = null

const listFolders = async (input: BrowseFoldersInput, context: ProcedureContext): Promise<FolderListing | null> => {
  const listing = await context.setupEnvironment.listFolders(input.path)
  return listing === null && input.purpose === "install-folder"
    ? await context.setupEnvironment.listFolders(HOME_FOLDER)
    : listing
}

export const browseFolders = async (input: BrowseFoldersInput, context: ProcedureContext): Promise<FolderBrowser | null> => {
  const [listing, setup, listedRepositories] = await Promise.all([
    listFolders(input, context),
    context.setupStore.read(),
    context.repositoryStore.list(),
  ])
  return listing === null
    ? null
    : buildFolderBrowser(listing, addedRepositoryPaths(setup, listedRepositories), input.purpose)
}
