import type { Environment } from "@/procedures/get-setup/utils/agent-folders"
import type { ForgesChoice, SetupForge } from "@/procedures/get-setup/utils/setup"
import type { ForgeAdapterName, ForgeProblem, RepositoryProblem } from "@/procedures/list-repositories/utils/repository"
import { FORGE_ADAPTERS, selectForge } from "@/procedures/list-repositories/utils/select-forge"
import type { ForgeCredentialReader } from "@/utils/forge-credential-reader"
import { type GitAdapterInput, type Resolved, type Remote, GitAdapterError } from "@flightplan/git-forge"

const FORGES_WITHOUT_CREDENTIAL: readonly SetupForge[] = ["git", "gh", "glab"]

export const problemOf = (error: unknown): ForgeProblem => (error instanceof GitAdapterError ? error.problem : "unknown")

export const repositoryProblemOf = (error: unknown): RepositoryProblem => ({
  kind: problemOf(error),
  detail: error instanceof Error ? error.message : null,
})

export interface RepositoryAdapterOpenerDependencies {
  readonly readRemote: (path: string) => Promise<Remote | null>
  readonly openAdapter: (input: GitAdapterInput) => Promise<Resolved>
  readonly readCredential: ForgeCredentialReader
  readonly environment: Environment
}

export interface OpenedRepository {
  readonly forge: SetupForge
  readonly adapterName: ForgeAdapterName
  readonly forgeSlug: string | null
  readonly resolved: Resolved
}

export type RepositoryAdapterOpener = (path: string, forges: ForgesChoice | null) => Promise<OpenedRepository>

export const createRepositoryAdapterOpener = (dependencies: RepositoryAdapterOpenerDependencies): RepositoryAdapterOpener =>
  async (path, forges) => {
    const remote = await dependencies.readRemote(path)
    const choice = selectForge(forges, remote)
    const adapterName = FORGE_ADAPTERS[choice.forge]
    const resolved = await dependencies.openAdapter({
      id: adapterName,
      root: path,
      secret: FORGES_WITHOUT_CREDENTIAL.includes(choice.forge) ? null : await dependencies.readCredential(choice.forge),
      username: choice.connection?.username ?? "",
      baseUrl: choice.connection?.baseUrl ?? "",
      environment: dependencies.environment,
    })
    return { forge: choice.forge, adapterName, forgeSlug: remote?.fullName ?? null, resolved }
  }
