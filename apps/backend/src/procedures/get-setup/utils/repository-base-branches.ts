import type { SetupRepository } from "./setup"
import type { SetupEnvironment } from "./setup-environment"

export type RepositoryBaseBranches = Readonly<Record<string, string>>

type BaseBranchEntry = readonly [string, string | null]

const isFoundBaseBranch = (entry: BaseBranchEntry): entry is readonly [string, string] => entry[1] !== null

export const resolveBaseBranch = async (
  repository: Pick<SetupRepository, "path" | "baseBranch">,
  environment: Pick<SetupEnvironment, "detectMainBranch">,
): Promise<string | null> => repository.baseBranch ?? await environment.detectMainBranch(repository.path)

export const findRepositoryBaseBranches = async (
  repositories: readonly Pick<SetupRepository, "path" | "baseBranch">[],
  environment: Pick<SetupEnvironment, "detectMainBranch">,
): Promise<RepositoryBaseBranches> => {
  const entries = await Promise.all(
    repositories.map(async (repository): Promise<BaseBranchEntry> => [repository.path, await resolveBaseBranch(repository, environment)]),
  )
  return Object.fromEntries(entries.filter(isFoundBaseBranch))
}

export const repositoryBaseBranchOf = (baseBranches: RepositoryBaseBranches, path: string): string | null =>
  baseBranches[path] ?? null
