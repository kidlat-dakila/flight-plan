import type { ProcedureContext } from "@/procedures/context"
import { resolveBaseBranch } from "@/procedures/get-setup/utils/repository-base-branches"
import { buildRepositoryConfiguration } from "./utils/build-repository-configuration"
import type { GetRepositoryConfigurationInput, RepositoryConfiguration } from "./utils/schemas"

export const getRepositoryConfiguration = async (
  input: GetRepositoryConfigurationInput,
  context: ProcedureContext,
): Promise<RepositoryConfiguration | null> => {
  const [listedRepositories, authors, setup] = await Promise.all([
    context.repositoryStore.listRegistered(),
    context.repositoryStore.readAuthors(input.name),
    context.setupStore.read(),
  ])
  const repository = listedRepositories.find((listed) => listed.name === input.name)
  if (repository === undefined || authors === null) return null
  const [forge, identity, baseBranch] = await Promise.all([
    context.setupEnvironment.findRepositoryForge(repository.path, setup.forges),
    context.setupEnvironment.readGitIdentity(repository.path),
    resolveBaseBranch(repository, context.setupEnvironment),
  ])
  return buildRepositoryConfiguration({ ...repository, baseBranch }, authors, forge, identity)
}
