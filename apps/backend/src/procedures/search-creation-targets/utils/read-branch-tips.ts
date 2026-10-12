import type { ForgesChoice } from "@/procedures/get-setup/utils/setup"
import type { RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { GitAdapterError, type BranchScope, type BranchTip } from "@flightplan/git-forge"

const CHECKOUT_SCOPE: BranchScope = "checkout"

export const readBranchTips = async (
  repositoryPath: string,
  forges: ForgesChoice | null,
  openRepository: RepositoryAdapterOpener,
): Promise<readonly BranchTip[]> => {
  const opened = await openRepository(repositoryPath, forges)
  if (!opened.resolved.ok) return []
  try {
    return await opened.resolved.gitAdapter.listBranches(CHECKOUT_SCOPE)
  } catch (error) {
    if (error instanceof GitAdapterError) return []
    throw error
  }
}
