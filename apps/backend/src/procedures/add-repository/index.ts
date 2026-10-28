import type { ProcedureContext } from "@/procedures/context"
import { findBaseBranch } from "@/procedures/set-base-branch/utils/find-base-branch"
import { notRepositoryMessage, planRepositoryAddition, type RepositoryAddition } from "./utils/plan-repository-addition"
import { resolveRepositoryAuthors } from "./utils/resolve-repository-authors"
import type { AddRepositoryInput } from "./utils/schemas"

export const addRepository = async (
  input: AddRepositoryInput,
  context: ProcedureContext,
): Promise<RepositoryAddition> => {
  const [setup, listedRepositories] = await Promise.all([context.setupStore.read(), context.repositoryStore.listRegistered()])
  const addition = planRepositoryAddition(listedRepositories, input.path)
  if (addition.kind === "rejected") return addition
  const { repository } = addition
  if (!(await context.setupEnvironment.isRepositoryFolder(repository.path))) {
    return { kind: "rejected", message: notRepositoryMessage(repository.path) }
  }
  const [finding, baseBranchFinding] = await Promise.all([
    resolveRepositoryAuthors(context, setup, repository, input),
    findBaseBranch(context.setupEnvironment, repository.path, input.baseBranch),
  ])
  if (finding.kind === "rejected") return finding
  if (baseBranchFinding.kind === "rejected") return baseBranchFinding
  const added = { ...repository, baseBranch: baseBranchFinding.baseBranch }
  await context.repositoryStore.add(added, finding.authors)
  return { kind: "accepted", repository: added }
}
