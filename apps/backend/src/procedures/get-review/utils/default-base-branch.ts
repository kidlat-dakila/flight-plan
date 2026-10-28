import type { ProcedureContext } from "@/procedures/context"
import { resolveBaseBranch } from "@/procedures/get-setup/utils/repository-base-branches"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { DefaultBaseBranch } from "./build-creation"

type BaseBranchContext = Pick<ProcedureContext, "openRepository" | "setupStore" | "setupEnvironment">

const readPullRequestBase = async (repository: Repository, number: number, context: BaseBranchContext): Promise<string | null> => {
  const setup = await context.setupStore.read()
  const opened = await context.openRepository(repository.path, setup.forges, repository.baseBranch)
  if (!opened.resolved.ok) return null
  try {
    const target = await opened.resolved.gitAdapter.target({ kind: "pr", number })
    return target?.baseRef ?? null
  } catch {
    return null
  }
}

const readRepositoryBase = async (repository: Repository, context: BaseBranchContext): Promise<DefaultBaseBranch> => ({
  branchName: await resolveBaseBranch(repository, context.setupEnvironment),
  origin: "repository",
})

export const readDefaultBaseBranch = async (
  repository: Repository,
  target: ReviewTarget,
  context: BaseBranchContext,
): Promise<DefaultBaseBranch> => {
  const pullRequestBase = target.kind === "pull-request" ? await readPullRequestBase(repository, target.number, context) : null
  return pullRequestBase === null ? await readRepositoryBase(repository, context) : { branchName: pullRequestBase, origin: "pull-request" }
}
