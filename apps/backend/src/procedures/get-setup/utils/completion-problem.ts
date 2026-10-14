import { needsSelfAuthor, repositoryForgeOf, type RepositoryForges, type Setup, type SetupRepository } from "./setup"

type AuthoredRepository = Pick<SetupRepository, "name" | "selfAuthor">

export const findRepositoryAuthorsProblem = (
  repository: AuthoredRepository,
  isSelfAuthorNeeded: boolean,
): string | null =>
  isSelfAuthorNeeded && repository.selfAuthor === null ? `Pick which user you are in ${repository.name}.` : null

const findRepositoryProblem = (setup: Setup, repositoryForges: RepositoryForges): string | null =>
  setup.repositories
    .map((repository) =>
      findRepositoryAuthorsProblem(repository, needsSelfAuthor(repositoryForgeOf(setup, repositoryForges, repository.path))),
    )
    .find((problem) => problem !== null) ?? null

export const findCompletionProblem = (setup: Setup, repositoryForges: RepositoryForges): string | null => {
  if (setup.agents === null) return "Choose your agents first."
  if (setup.forges === null) return "Connect a git forge first."
  if (setup.preset === null) return "Choose a default configuration first."
  if (setup.repositories.length === 0) return "Add at least one repository."
  return findRepositoryProblem(setup, repositoryForges)
}
