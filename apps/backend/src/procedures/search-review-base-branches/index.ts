import type { ProcedureContext } from "@/procedures/context"
import { searchBaseBranches } from "@/procedures/search-base-branches"
import { withoutBaseBranches } from "@/procedures/search-base-branches/utils/build-base-branch-suggestions"
import type { BaseBranchSuggestions } from "@/procedures/search-base-branches/utils/schemas"
import type { SearchReviewBaseBranchesInput } from "./utils/schemas"

const NOT_LISTED_MESSAGE = "This repository is not listed in Flight Plan."

export const searchReviewBaseBranches = async (
  input: SearchReviewBaseBranchesInput,
  context: ProcedureContext,
): Promise<BaseBranchSuggestions> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  return repository === undefined
    ? withoutBaseBranches(NOT_LISTED_MESSAGE)
    : await searchBaseBranches({ path: repository.path, query: input.query }, context)
}
