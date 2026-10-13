import type { ProcedureContext } from "@/procedures/context"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { listLinkablePullRequests } from "@/procedures/mark-complete/utils/linkable-pull-requests"
import { isPublishingUnderway } from "@/procedures/publish-artifact/utils/publishing-progress"
import { highlightReview, NO_REVIEWED_MARKS, type HighlightedReview } from "@flightplan/codegraph"
import type { BranchLinking } from "./utils/build-complete-action"
import { NO_WRITING_ACTIVITY, type WritingActivity } from "./utils/build-progress"
import { buildReviewPage } from "./utils/build-review-page"
import { branchNameOf } from "./utils/change-reader"
import { findReviewTarget } from "./utils/find-review-target"
import { readLiveTargetDetail } from "./utils/live-target-detail"
import { isOwnTarget } from "./utils/own-target"
import type { ReviewKey } from "./utils/review-store"
import type { ReviewSubject } from "./utils/review-subject"
import type { GetReviewInput, ReviewPage } from "./utils/schemas"
import { buildReviewPrompt } from "./utils/start/review-prompt"
import { startableAgentsOf } from "./utils/start/startable-agents"

const NOTHING_HIGHLIGHTED: HighlightedReview = { sources: [], solutionTokens: new Map() }

const findListedSubject = async (key: ReviewKey, context: ProcedureContext): Promise<ReviewSubject | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === key.repositoryName)
  if (repository === undefined) return null
  const target = await findReviewTarget(repository, key.targetId, context)
  if (target === null) return null
  const [artifact, sampleDetail, viewerLogin] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findTargetDetail(key),
    context.repositoryStore.readViewerLogin(repository.name),
  ])
  return {
    repository,
    lineColor: lineColorAt(repositories.indexOf(repository)),
    target,
    isOwn: isOwnTarget(target, viewerLogin),
    artifact,
    detail: sampleDetail ?? await readLiveTargetDetail(context.changeReader, repository.path, branchNameOf(target)),
    notice: sampleDetail === null ? null : context.dataNotice,
  }
}

const findFixtureSubject = async (key: ReviewKey, context: ProcedureContext): Promise<ReviewSubject | null> => {
  if (IS_DEVELOPMENT_BUILD) {
    const { getFixtureReview } = await import("@/procedures/get-fixture-review")
    return await getFixtureReview({ caseName: key.repositoryName, snapshotName: key.targetId }, context)
  }
  return null
}

export const findReviewSubject = async (key: ReviewKey, context: ProcedureContext): Promise<ReviewSubject | null> =>
  (await findListedSubject(key, context)) ?? (await findFixtureSubject(key, context))

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

const readBranchLinking = async (subject: ReviewSubject, context: ProcedureContext): Promise<BranchLinking | null> => {
  const { target } = subject
  if (!subject.isOwn || target.kind !== "branch" || subject.artifact === null) return null
  return { branch: target, pullRequests: await listLinkablePullRequests(subject.repository, target.name, context) }
}

export const getReview = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewPage | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const subject = await findReviewSubject(key, context)
  if (subject === null) return null
  const [marks, discussion, publications, publishingRequest, setup, activity, branchLinking] = await Promise.all([
    subject.isOwn ? NO_REVIEWED_MARKS : context.reviewStore.readReviewedMarks(key),
    context.reviewStore.readDiscussion(key),
    context.reviewStore.readPublications(key),
    context.reviewStore.readPublishingRequest(key),
    context.setupStore.read(),
    readWritingActivity(subject, key, context),
    readBranchLinking(subject, context),
  ])
  const { artifact } = subject
  const agentModels = artifact === null ? await listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment) : {}
  const highlighted = artifact === null ? NOTHING_HIGHLIGHTED : await highlightReview(artifact, context.highlightCode)
  return buildReviewPage(
    {
      ...subject,
      marks,
      branchLinking,
      discussion,
      publications,
      isPublishing: isPublishingUnderway(publishingRequest, publications, context.conversationEnvironment.agents.find(key) !== null, context.now()),
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
