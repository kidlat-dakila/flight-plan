import type { Setup, SetupRepository } from "@/procedures/get-setup/utils/setup"

export const withBaseBranch = (setup: Setup, repositoryName: string, baseBranch: string): Setup => ({
  ...setup,
  repositories: setup.repositories.map((repository): SetupRepository =>
    repository.name === repositoryName ? { ...repository, baseBranch } : repository,
  ),
})
