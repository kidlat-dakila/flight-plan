import type { ProcedureContext } from "@/procedures/context"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { targetIdOf } from "@/procedures/list-repositories/utils/target-id"
import { highlightReview, type HighlightedReview } from "@flightplan/codegraph"
import { NO_WRITING_ACTIVITY, type WritingActivity } from "./utils/build-progress"
import { buildReviewPage } from "./utils/build-review-page"
import { branchNameOf } from "./utils/change-reader"
import { readLiveTargetDetail } from "./utils/live-target-detail"
import type { ReviewKey } from "./utils/review-store"
import type { ReviewSubject } from "./utils/review-subject"
import type { GetReviewInput, ReviewPage } from "./utils/schemas"
import { buildReviewPrompt } from "./utils/start/review-prompt"
import { startableAgentsOf } from "./utils/start/startable-agents"

const NOTHING_HIGHLIGHTED: HighlightedReview = { sources: [], solutionTokens: new Map() }

const findListedSubject = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewSubject | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === input.repositoryName)
  const target = repository?.targets.find((candidate) => targetIdOf(candidate) === input.targetId)
  if (repository === undefined || target === undefined) return null
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [artifact, sampleDetail] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findTargetDetail(key),
  ])
  return {
    repository,
    lineColor: lineColorAt(repositories.indexOf(repository)),
    target,
    artifact,
    detail: sampleDetail ?? await readLiveTargetDetail(context.changeReader, repository.path, branchNameOf(target)),
    notice: sampleDetail === null ? null : context.dataNotice,
  }
}

const findFixtureSubject = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewSubject | null> => {
  if (IS_DEVELOPMENT_BUILD) {
    const { getFixtureReview } = await import("@/procedures/get-fixture-review")
    return await getFixtureReview({ caseName: input.repositoryName, snapshotName: input.targetId }, context)
  }
  return null
}

const readWritingActivity = async (subject: ReviewSubject, key: ReviewKey, context: ProcedureContext): Promise<WritingActivity> => {
  if (subject.artifact?.status !== "drafting") return NO_WRITING_ACTIVITY
  const { store, agents } = context.conversationEnvironment
  const [request, conversation] = await Promise.all([context.reviewStore.findRequest(key), store.read(key)])
  return {
    request,
    isAgentRunning: agents.find(key) !== null,
    journal: conversation.journal,
    prompt: request === null ? null : buildReviewPrompt(subject.repository, subject.target, key, request),
  }
}

export const getReview = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewPage | null> => {
  const subject = (await findListedSubject(input, context)) ?? (await findFixtureSubject(input, context))
  if (subject === null) return null
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const [marks, discussion, publications, setup, activity] = await Promise.all([
    context.reviewStore.readReviewedMarks(key),
    context.reviewStore.readDiscussion(key),
    context.reviewStore.readPublications(key),
    context.setupStore.read(),
    readWritingActivity(subject, key, context),
  ])
  const { artifact } = subject
  const agentModels = artifact === null ? await listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment) : {}
  const highlighted = artifact === null ? NOTHING_HIGHLIGHTED : await highlightReview(artifact, context.highlightCode)
  return buildReviewPage(
    {
      ...subject,
      marks,
      discussion,
      publications,
      now: context.now(),
      setup,
      startableAgents: startableAgentsOf(context.conversationEnvironment.spawners),
      agentModels,
      activity,
      ...highlighted,
    },
    input,
  )
}
