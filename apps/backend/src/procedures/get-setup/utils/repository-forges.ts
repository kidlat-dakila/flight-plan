import type { RepositoryForges, Setup } from "./setup"
import type { SetupEnvironment } from "./setup-environment"

export const findRepositoryForges = async (
  setup: Setup,
  environment: Pick<SetupEnvironment, "findRepositoryForge">,
): Promise<RepositoryForges> => {
  const entries = await Promise.all(
    setup.repositories.map(
      async ({ path }) => [path, await environment.findRepositoryForge(path, setup.forges)] as const,
    ),
  )
  return Object.fromEntries(entries)
}
