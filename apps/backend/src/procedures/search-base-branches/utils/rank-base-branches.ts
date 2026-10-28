import type { Fzf as FzfClass } from "fzf"
import type { RepositoryBranch } from "./repository-branches"

const DEFAULT_BRANCH_COUNT = 5
const MATCHED_BRANCH_LIMIT = 10

interface FzfModule {
  readonly Fzf: typeof FzfClass
}

const loadFzf = async (): Promise<FzfModule> => await import("fzf")

const byLatestCommit = (first: RepositoryBranch, second: RepositoryBranch): number =>
  second.committedAt.getTime() - first.committedAt.getTime()

export const rankBaseBranches = async (
  branches: readonly RepositoryBranch[],
  query: string,
): Promise<readonly RepositoryBranch[]> => {
  const trimmedQuery = query.trim()
  if (trimmedQuery === "") return [...branches].sort(byLatestCommit).slice(0, DEFAULT_BRANCH_COUNT)
  const { Fzf } = await loadFzf()
  return new Fzf(branches, { selector: (branch) => branch.name, casing: "case-insensitive", limit: MATCHED_BRANCH_LIMIT })
    .find(trimmedQuery)
    .map((match) => match.item)
}
