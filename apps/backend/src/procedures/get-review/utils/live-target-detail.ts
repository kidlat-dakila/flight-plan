import type { ChangeReader } from "./change-reader"
import type { ReviewTargetDetail } from "./review-artifact"

export const readLiveTargetDetail = async (
  changeReader: ChangeReader,
  repositoryPath: string,
  branchName: string,
): Promise<ReviewTargetDetail | null> => {
  const revision = await changeReader.findRevision(repositoryPath, branchName)
  const changedPaths = revision === null ? null : await changeReader.listChangedPaths(repositoryPath, revision)
  return revision === null || changedPaths === null
    ? null
    : { headCommit: revision.headCommit, forgeUrl: null, reviewers: [], changedPaths }
}
