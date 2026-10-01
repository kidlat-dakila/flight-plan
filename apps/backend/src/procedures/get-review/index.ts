import type { ProcedureContext } from "@/procedures/context"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { buildReviewPage } from "./utils/build-review-page"
import { highlightReview, type HighlightedReview } from "./utils/code/highlight-review"
import type { GetReviewInput, ReviewPage } from "./utils/schemas"

const NOTHING_HIGHLIGHTED: HighlightedReview = { sources: [], solutionTokens: new Map() }

export const getReview = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewPage | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  const target = repository?.targets.find((candidate) => targetIdOf(candidate) === input.targetId)
  if (repository === undefined || target === undefined) return null
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, detail, marks, discussion, publications] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findTargetDetail(key),
    context.reviewStore.readReviewedMarks(key),
    context.reviewStore.readDiscussion(key),
    context.reviewStore.readPublications(key),
  ])
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
      notice: context.dataNotice,
      ...highlighted,
    },
    input,
  )
}
