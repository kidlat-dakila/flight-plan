import type { SetupEnvironment } from "@/procedures/get-setup/utils/setup-environment"
import { selectForge } from "@/procedures/list-repositories/utils/select-forge"
import type { Remote } from "@/utils/git-adapter/helpers/remote"

export interface RepositoryForgeFinderDependencies {
  readonly readRemote: (path: string) => Promise<Remote | null>
}

export const createRepositoryForgeFinder = (
  dependencies: RepositoryForgeFinderDependencies,
): SetupEnvironment["findRepositoryForge"] =>
  async (path, forges) => selectForge(forges, await dependencies.readRemote(path)).forge
