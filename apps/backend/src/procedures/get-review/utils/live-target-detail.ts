import type { Repository } from "@/procedures/list-repositories/utils/repository"
import type { ChangeReader } from "./change-reader"
import type { PullRequestReading } from "./pull-request-forge"
import type { ReviewTargetDetail } from "./review-target-detail"

export const withForgeDetail = (detail: ReviewTargetDetail | null, forge: PullRequestReading | null): ReviewTargetDetail | null =>
  detail === null || forge?.kind !== "read"
    ? detail
    : { ...detail, forgeUrl: forge.pullRequest.url, reviewers: forge.pullRequest.reviewers }

export const readLiveTargetDetail = async (
  changeReader: ChangeReader,
  repository: Pick<Repository, "path" | "baseBranch">,
  branchName: string,
): Promise<ReviewTargetDetail | null> => {
  const revision = await changeReader.findRevision(repository.path, branchName, repository.baseBranch)
  const changedPaths = revision === null ? null : await changeReader.listChangedPaths(repository.path, revision)
  return revision === null || changedPaths === null
    ? null
    : { headCommit: revision.headCommit, forgeUrl: null, reviewers: [], changedPaths }
}
