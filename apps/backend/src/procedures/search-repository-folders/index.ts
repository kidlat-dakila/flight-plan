import type { ProcedureContext } from "@/procedures/context"
import { addedRepositoryPaths } from "@/procedures/get-setup/utils/added-paths"
import { buildFolderSuggestions } from "./utils/build-folder-suggestions"
import { ASK_FOR_MORE_CHARACTERS, hasEnoughCharacters } from "./utils/folder-query"
import { rankRepositoryFolders } from "./utils/rank-repository-folders"
import type { FolderSuggestions, SearchRepositoryFoldersInput } from "./utils/schemas"

export const searchRepositoryFolders = async (
  input: SearchRepositoryFoldersInput,
  context: ProcedureContext,
): Promise<FolderSuggestions> => {
  if (!hasEnoughCharacters(input.query)) return ASK_FOR_MORE_CHARACTERS
  const [repositoryFolders, setup, listedRepositories] = await Promise.all([
    context.setupEnvironment.findRepositoryFolders(),
    context.setupStore.read(),
    context.repositoryStore.list(),
  ])
  const rankedPaths = await rankRepositoryFolders(repositoryFolders.paths, input.query, repositoryFolders.rootPath)
  return buildFolderSuggestions(rankedPaths, addedRepositoryPaths(setup, listedRepositories), input.query)
}
