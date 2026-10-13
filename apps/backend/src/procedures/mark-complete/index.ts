import type { ProcedureContext } from "@/procedures/context"
import type { ReviewKey } from "@/procedures/get-review/utils/review-store"
import type { PullRequestTarget } from "@/procedures/list-repositories/utils/repository"
import { branchNameOfTargetId, targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import type { ReviewArtifact } from "@flightplan/configurations"
import { listLinkablePullRequests } from "./utils/linkable-pull-requests"
import type { MarkCompleteInput, MarkCompleteResult } from "./utils/schemas"

const COMPLETE_STATUS = "complete"
const COMPLETED_MESSAGE = "Flight Plan marked as complete"

const movedMessage = (pullRequest: PullRequestTarget): string =>
  `${COMPLETED_MESSAGE} and moved to pull request #${String(pullRequest.number)}`

const completeAs = async (
  key: ReviewKey,
  complete: (artifact: ReviewArtifact) => ReviewArtifact,
  message: string,
  context: ProcedureContext,
): Promise<MarkCompleteResult | null> =>
  await context.reviewStore.amendArtifact<MarkCompleteResult>(key, (artifact) => ({
    artifact: complete(artifact),
    outcome: { message, targetId: key.targetId },
  }))

const findLinkablePullRequest = async (
  key: ReviewKey,
  pullRequestTargetId: string,
  context: ProcedureContext,
): Promise<PullRequestTarget | null> => {
  const branchName = branchNameOfTargetId(key.targetId)
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === key.repositoryName)
  if (branchName === null || repository === undefined) return null
  const linkable = await listLinkablePullRequests(repository, branchName, context)
  return linkable.find((pullRequest) => targetIdOf(pullRequest) === pullRequestTargetId) ?? null
}

const moveToPullRequest = async (
  key: ReviewKey,
  pullRequestTargetId: string,
  context: ProcedureContext,
): Promise<MarkCompleteResult | null> => {
  const pullRequest = await findLinkablePullRequest(key, pullRequestTargetId, context)
  if (pullRequest === null) return null
  const pullRequestKey = { repositoryName: key.repositoryName, targetId: pullRequestTargetId }
  const isMoved = await context.reviewStore.moveScaffold(key, pullRequestKey)
  if (!isMoved) return null
  return await completeAs(
    pullRequestKey,
    (artifact) => ({ ...artifact, title: pullRequest.title, status: COMPLETE_STATUS }),
    movedMessage(pullRequest),
    context,
  )
}

export const markComplete = async (input: MarkCompleteInput, context: ProcedureContext): Promise<MarkCompleteResult | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  return input.pullRequestTargetId === null
    ? await completeAs(key, (artifact) => ({ ...artifact, status: COMPLETE_STATUS }), COMPLETED_MESSAGE, context)
    : await moveToPullRequest(key, input.pullRequestTargetId, context)
}
