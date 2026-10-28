import type { ForgesChoice } from "@/procedures/get-setup/utils/setup"
import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { GitAdapterError, type BranchScope, type BranchTip } from "@flightplan/git-forge"

const CHECKOUT_SCOPE: BranchScope = "checkout"

export const readBranchTips = async (
  repository: Pick<Repository, "path" | "baseBranch">,
  forges: ForgesChoice | null,
  openRepository: RepositoryAdapterOpener,
): Promise<readonly BranchTip[]> => {
  const opened = await openRepository(repository.path, forges, repository.baseBranch)
  if (!opened.resolved.ok) return []
  try {
    return await opened.resolved.gitAdapter.listBranches(CHECKOUT_SCOPE)
  } catch (error) {
    if (error instanceof GitAdapterError) return []
    throw error
  }
}
