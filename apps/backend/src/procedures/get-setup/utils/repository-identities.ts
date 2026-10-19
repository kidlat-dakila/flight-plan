import type { GitIdentity, RepositoryIdentities } from "./git-identity"
import type { Setup } from "./setup"
import type { SetupEnvironment } from "./setup-environment"

type IdentityEntry = readonly [string, GitIdentity | null]

const isKnownIdentity = (entry: IdentityEntry): entry is readonly [string, GitIdentity] => entry[1] !== null

export const findRepositoryIdentities = async (
  setup: Setup,
  environment: Pick<SetupEnvironment, "readGitIdentity">,
): Promise<RepositoryIdentities> => {
  const entries = await Promise.all(
    setup.repositories.map(async ({ path }): Promise<IdentityEntry> => [path, await environment.readGitIdentity(path)]),
  )
  return Object.fromEntries(entries.filter(isKnownIdentity))
}
