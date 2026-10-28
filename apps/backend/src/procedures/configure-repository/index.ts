import { missingRepositoryMessage } from "@/procedures/add-repository/utils/plan-repository-addition"
import { resolveRepositoryAuthors } from "@/procedures/add-repository/utils/resolve-repository-authors"
import type { ProcedureContext } from "@/procedures/context"
import { findBaseBranch, type BaseBranchFinding } from "@/procedures/set-base-branch/utils/find-base-branch"
import type { ConfigureRepositoryInput, RepositoryConfiguring } from "./utils/schemas"

const NO_CHOSEN_BASE_BRANCH: BaseBranchFinding = { kind: "found", baseBranch: null }

const findChosenBaseBranch = async (
  context: ProcedureContext,
  repositoryPath: string,
  chosenBranch: string | null,
): Promise<BaseBranchFinding> =>
  chosenBranch === null ? NO_CHOSEN_BASE_BRANCH : await findBaseBranch(context.setupEnvironment, repositoryPath, chosenBranch)

const replaceBaseBranch = async (context: ProcedureContext, repositoryName: string, baseBranch: string | null): Promise<boolean> =>
  baseBranch === null || await context.repositoryStore.replaceBaseBranch(repositoryName, baseBranch)

export const configureRepository = async (
  input: ConfigureRepositoryInput,
  context: ProcedureContext,
): Promise<RepositoryConfiguring> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.listRegistered()])
  const repository = listedRepositories.find((listed) => listed.name === input.repositoryName)
  if (repository === undefined) return { kind: "rejected", message: missingRepositoryMessage(input.repositoryName) }
  const [finding, baseBranchFinding] = await Promise.all([
    resolveRepositoryAuthors(context, setup, repository, input),
    findChosenBaseBranch(context, repository.path, input.baseBranch),
  ])
  if (finding.kind === "rejected") return finding
  if (baseBranchFinding.kind === "rejected") return baseBranchFinding
  const isReplaced = await context.repositoryStore.replaceAuthors(repository.name, finding.authors)
    && await replaceBaseBranch(context, repository.name, baseBranchFinding.baseBranch)
  return isReplaced ? { kind: "accepted" } : { kind: "rejected", message: missingRepositoryMessage(repository.name) }
}
