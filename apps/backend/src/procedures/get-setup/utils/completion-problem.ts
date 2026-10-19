import { isSelfAuthorChoiceNeeded, repositoryIdentityOf, type RepositoryIdentities } from "./git-identity"
import { repositoryForgeOf, type RepositoryForges, type Setup, type SetupRepository } from "./setup"

type AuthoredRepository = Pick<SetupRepository, "name" | "selfAuthor">

export const findRepositoryAuthorsProblem = (
  repository: AuthoredRepository,
  isSelfAuthorNeeded: boolean,
): string | null =>
  isSelfAuthorNeeded && repository.selfAuthor === null ? `Pick which user you are in ${repository.name}.` : null

const findRepositoryProblem = (
  setup: Setup,
  repositoryForges: RepositoryForges,
  repositoryIdentities: RepositoryIdentities,
): string | null =>
  setup.repositories
    .map((repository) =>
      findRepositoryAuthorsProblem(
        repository,
        isSelfAuthorChoiceNeeded(
          repositoryForgeOf(repositoryForges, repository.path),
          repositoryIdentityOf(repositoryIdentities, repository.path),
        ),
      ),
    )
    .find((problem) => problem !== null) ?? null

export const findRepositoriesProblem = (
  setup: Setup,
  repositoryForges: RepositoryForges,
  repositoryIdentities: RepositoryIdentities,
): string | null => {
  if (setup.repositories.length === 0) return "Add at least one repository."
  return findRepositoryProblem(setup, repositoryForges, repositoryIdentities)
}

export const findCompletionProblem = (
  setup: Setup,
  repositoryForges: RepositoryForges,
  repositoryIdentities: RepositoryIdentities,
): string | null => {
  const repositoriesProblem = findRepositoriesProblem(setup, repositoryForges, repositoryIdentities)
  if (repositoriesProblem !== null) return repositoriesProblem
  if (setup.forges === null) return "Connect a git forge first."
  if (setup.agents === null) return "Choose your agents first."
  if (setup.defaultConfiguration === null) return "Choose a default prompt configuration first."
  return null
}
