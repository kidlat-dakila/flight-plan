import { isAbsolutePath, notRepositoryMessage } from "@/procedures/add-repository/utils/plan-repository-addition"
import type { ProcedureContext } from "@/procedures/context"
import { buildBaseBranchSuggestions, withoutBaseBranches } from "./utils/build-base-branch-suggestions"
import { rankBaseBranches } from "./utils/rank-base-branches"
import type { BaseBranchSuggestions, SearchBaseBranchesInput } from "./utils/schemas"

const NO_FOLDER_MESSAGE = "Choose the repository folder first."

export const searchBaseBranches = async (
  input: SearchBaseBranchesInput,
  context: ProcedureContext,
): Promise<BaseBranchSuggestions> => {
  const path = input.path.trim()
  if (!isAbsolutePath(path)) return withoutBaseBranches(NO_FOLDER_MESSAGE)
  const [branches, detectedBranch] = await Promise.all([
    context.setupEnvironment.listBranches(path),
    context.setupEnvironment.detectMainBranch(path),
  ])
  if (branches === null) return withoutBaseBranches(notRepositoryMessage(path))
  const ranked = await rankBaseBranches(branches, input.query)
  return buildBaseBranchSuggestions(ranked, detectedBranch, input.query, context.now())
}
