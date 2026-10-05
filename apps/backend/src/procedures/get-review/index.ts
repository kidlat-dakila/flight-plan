import type { ProcedureContext } from "@/procedures/context"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { buildReviewPage } from "./utils/build-review-page"
import { branchNameOf } from "./utils/change-reader"
import { highlightReview, type HighlightedReview } from "./utils/code/highlight-review"
import { readLiveTargetDetail } from "./utils/live-target-detail"
import type { GetReviewInput, ReviewPage } from "./utils/schemas"
import { startableAgentsOf } from "./utils/start/startable-agents"

const NOTHING_HIGHLIGHTED: HighlightedReview = { sources: [], solutionTokens: new Map() }

export const getReview = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewPage | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  const target = repository?.targets.find((candidate) => targetIdOf(candidate) === input.targetId)
  if (repository === undefined || target === undefined) return null
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, sampleDetail, marks, discussion, publications, setup] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findTargetDetail(key),
    context.reviewStore.readReviewedMarks(key),
    context.reviewStore.readDiscussion(key),
    context.reviewStore.readPublications(key),
    context.setupStore.read(),
  ])
  const detail = sampleDetail
    ?? await readLiveTargetDetail(context.changeReader, repository.path, branchNameOf(target))
  const highlighted = artifact === null ? NOTHING_HIGHLIGHTED : await highlightReview(artifact, context.highlightCode)
  return buildReviewPage(
    {
      repository,
      lineColor: lineColorAt(repositories.indexOf(repository)),
      target,
      detail,
      artifact,
      marks,
      discussion,
      publications,
      now: context.now(),
      notice: sampleDetail === null ? null : context.dataNotice,
      setup,
      startableAgents: startableAgentsOf(context.conversationEnvironment.spawners),
      ...highlighted,
    },
    input,
  )
}
