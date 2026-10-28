import type { ProcedureContext } from "@/procedures/context"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import { GitAdapterError } from "@flightplan/git-forge"

const LOCAL_GIT = "git"

export const readBranchAuthorEmail = async (
  repository: Repository,
  branchName: string,
  context: Pick<ProcedureContext, "setupStore" | "openRepository">,
): Promise<string | null> => {
  if (repository.forge !== LOCAL_GIT) return null
  const setup = await context.setupStore.read()
  const opened = await context.openRepository(repository.path, setup.forges, repository.baseBranch)
  if (!opened.resolved.ok) return null
  try {
    return (await opened.resolved.gitAdapter.branchStart(branchName))?.authorEmail ?? null
  } catch (error) {
    if (error instanceof GitAdapterError) return null
    throw error
  }
}
