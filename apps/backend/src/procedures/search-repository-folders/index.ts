import type { ProcedureContext } from "@/procedures/context"
import { addedRepositoryPaths } from "@/procedures/get-setup/utils/added-paths"
import { buildFolderSuggestions } from "./utils/build-folder-suggestions"
import type { FolderSuggestions, SearchRepositoryFoldersInput } from "./utils/schemas"

export const searchRepositoryFolders = async (
  input: SearchRepositoryFoldersInput,
  context: ProcedureContext,
): Promise<FolderSuggestions> => {
  const [paths, setup, listedRepositories] = await Promise.all([
    context.setupEnvironment.searchRepositoryFolders(input.query),
    context.setupStore.read(),
    context.repositoryStore.list(),
  ])
  return buildFolderSuggestions(paths, addedRepositoryPaths(setup, listedRepositories), input.query)
}
