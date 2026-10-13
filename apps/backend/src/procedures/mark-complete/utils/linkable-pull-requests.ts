import type { ProcedureContext } from "@/procedures/context"
import { normalizeLogin } from "@/procedures/list-repositories/utils/build-review-targets"
import type { PullRequestTarget, Repository } from "@/procedures/list-repositories/utils/repository"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { isOpenPullRequest } from "@/procedures/search-creation-targets/utils/select-creation-targets"

export interface PullRequestSelection {
  readonly pullRequests: readonly PullRequestTarget[]
  readonly branchName: string
  readonly viewerLogin: string | null
  readonly takenTargetIds: readonly string[]
}

const isWrittenBy = (viewerLogin: string | null) => (pullRequest: PullRequestTarget): boolean =>
  viewerLogin === null || normalizeLogin(pullRequest.author) === normalizeLogin(viewerLogin)

const ofBranchFirst = (branchName: string) => (first: PullRequestTarget, second: PullRequestTarget): number =>
  Number(second.branch === branchName) - Number(first.branch === branchName)
  || second.updatedAt.getTime() - first.updatedAt.getTime()

export const selectLinkablePullRequests = ({
  pullRequests,
  branchName,
  viewerLogin,
  takenTargetIds,
}: PullRequestSelection): readonly PullRequestTarget[] =>
  [...pullRequests]
    .filter(isWrittenBy(viewerLogin))
    .filter((pullRequest) => !takenTargetIds.includes(targetIdOf(pullRequest)))
    .sort(ofBranchFirst(branchName))

export const listLinkablePullRequests = async (
  repository: Repository,
  branchName: string,
  context: Pick<ProcedureContext, "repositoryStore" | "reviewStore">,
): Promise<readonly PullRequestTarget[]> => {
  const pullRequests = repository.targets.filter(isOpenPullRequest)
  const [viewerLogin, artifacts] = await Promise.all([
    context.repositoryStore.readViewerLogin(repository.name),
    Promise.all(pullRequests.map(async (pullRequest) =>
      await context.reviewStore.findArtifact({ repositoryName: repository.name, targetId: targetIdOf(pullRequest) }))),
  ])
  const takenTargetIds = pullRequests.filter((_, index) => artifacts[index] !== null).map(targetIdOf)
  return selectLinkablePullRequests({ pullRequests, branchName, viewerLogin, takenTargetIds })
}
