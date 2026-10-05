import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { selectForge } from "@/procedures/list-repositories/utils/select-forge"
import type { Remote } from "@flightplan/git-forge"

export interface RepositoryForgeFinderDependencies {
  readonly readRemote: (path: string) => Promise<Remote | null>
}

export const createRepositoryForgeFinder = (
  dependencies: RepositoryForgeFinderDependencies,
): SetupEnvironment["findRepositoryForge"] =>
  async (path, forges) => selectForge(forges, await dependencies.readRemote(path)).forge
