import { needsSelfAuthor, type Setup, type SetupRepository } from "./setup"

const findRepositoryProblem = (setup: Setup): string | null => {
  if (needsSelfAuthor(setup)) {
    const repositoryWithoutSelf = setup.repositories.find((repository) => repository.selfAuthor === null)
    return repositoryWithoutSelf === undefined ? null : `Choose which author is you in ${repositoryWithoutSelf.name}.`
  }
  const isUntracked = (repository: SetupRepository): boolean => repository.trackedAuthors.length === 0
  const untrackedRepository = setup.repositories.find(isUntracked)
  return untrackedRepository === undefined ? null : `Track at least one author in ${untrackedRepository.name}.`
}

export const findCompletionProblem = (setup: Setup): string | null => {
  if (setup.agents === null) return "Choose your agents first."
  if (setup.forges === null) return "Connect a git forge first."
  if (setup.preset === null) return "Choose a default configuration first."
  if (setup.repositories.length === 0) return "Add at least one repository."
  return findRepositoryProblem(setup)
}
