import type { ForgesChoice } from "@/procedures/get-setup/utils/setup"
import type { ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { RepositoryAdapterOpener } from "@/utils/repository-adapter-opener"
import { GitAdapterError, type GitAdapter, type ReviewTarget as ForgeTarget } from "@flightplan/git-forge"
import { selectAddableTargets } from "./select-addable-targets"

const OPEN_PULL_REQUEST_LIMIT = 100

export type AddableTargetsReading
  = | { readonly kind: "read", readonly targets: readonly ReviewTarget[] }
    | { readonly kind: "unreadable", readonly message: string }

const readOpenPullRequests = async (adapter: GitAdapter): Promise<readonly ForgeTarget[]> => {
  try {
    return await adapter.listTargets({ includeMine: false, limit: OPEN_PULL_REQUEST_LIMIT })
  } catch (error) {
    if (error instanceof GitAdapterError) return []
    throw error
  }
}

const readFromAdapter = async (adapter: GitAdapter): Promise<AddableTargetsReading> => {
  try {
    const [branchTips, openPullRequests] = await Promise.all([adapter.listBranches(), readOpenPullRequests(adapter)])
    return { kind: "read", targets: selectAddableTargets({ branchTips, openPullRequests }) }
  } catch (error) {
    if (error instanceof GitAdapterError) return { kind: "unreadable", message: error.message }
    throw error
  }
}

export const readAddableTargets = async (
  repositoryPath: string,
  forges: ForgesChoice | null,
  openRepository: RepositoryAdapterOpener,
): Promise<AddableTargetsReading> => {
  const opened = await openRepository(repositoryPath, forges)
  return opened.resolved.ok
    ? await readFromAdapter(opened.resolved.gitAdapter)
    : { kind: "unreadable", message: opened.resolved.error.message }
}
