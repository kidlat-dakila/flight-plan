import type { ProcedureContext } from "@/procedures/context"
import { messageBodiesOf } from "@/procedures/get-conversation/utils/conversation"
import { installedAgentsOf } from "@/procedures/get-setup/utils/agent-models"
import { selfAuthorIdOf } from "@/procedures/get-setup/utils/git-identity"
import { listModelsOf } from "@/procedures/get-setup/utils/list-agent-models"
import { listConfigurationsOf, type Configuration } from "@/procedures/list-configurations/utils/configuration"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { listLinkablePullRequests } from "@/procedures/mark-complete/utils/linkable-pull-requests"
import { isPublishingUnderway } from "@/procedures/publish-artifact/utils/publishing-progress"
import { codeLinkIdsIn, highlightReview, type HighlightedReview } from "@flightplan/codegraph"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"
import { readBranchAuthorEmail } from "./utils/branch-author"
import type { BranchLinking } from "./utils/build-complete-action"
import { NO_WRITING_ACTIVITY, type WritingActivity } from "./utils/build-progress"
import { buildReviewPage } from "./utils/build-review-page"
import { branchNameOf } from "./utils/change-reader"
import { findReviewTarget } from "./utils/find-review-target"
import { readLiveTargetDetail, withForgeDetail } from "./utils/live-target-detail"
import { isOwnTarget } from "./utils/own-target"
import { isPullRequestSubject, type PullRequestSubject } from "./utils/review-action"
import type { ReviewKey } from "./utils/review-store"
import type { ReviewSubject } from "./utils/review-subject"
import type { GetReviewInput, ReviewPage } from "./utils/schemas"
import { buildReviewPrompt } from "./utils/start/review-prompt"
import { startableAgentsOf } from "./utils/start/startable-agents"

const NO_CONFIGURATIONS: readonly Configuration[] = []

const NOTHING_HIGHLIGHTED: HighlightedReview = { sources: [], solutionTokens: new Map() }

const findListedSubject = async (key: ReviewKey, context: ProcedureContext): Promise<ReviewSubject | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === key.repositoryName)
  if (repository === undefined) return null
  const target = await findReviewTarget(repository, key.targetId, context)
  if (target === null) return null
  const [artifact, sampleDetail, viewerLogin, authors, branchAuthorEmail, gitIdentity, forge] = await Promise.all([
    context.reviewStore.findArtifact(key),
    context.reviewStore.findTargetDetail(key),
    context.repositoryStore.readViewerLogin(repository.name),
    context.repositoryStore.readAuthors(repository.name),
    target.kind === "branch" ? readBranchAuthorEmail(repository, target.name, context) : null,
    target.kind === "branch" ? context.setupEnvironment.readGitIdentity(repository.path) : null,
    target.kind === "pull-request" ? context.pullRequestForge.read(repository, target.number) : null,
  ])
  const detail = sampleDetail ?? await readLiveTargetDetail(context.changeReader, repository.path, branchNameOf(target))
  return {
    repository,
    lineColor: lineColorAt(repositories.indexOf(repository)),
    target,
    isOwn: isOwnTarget(target, {
      viewerLogin,
      selfAuthorId: selfAuthorIdOf(gitIdentity, authors?.selfAuthor ?? null),
      branchAuthorEmail,
    }),
    isStored: true,
    artifact,
    detail: withForgeDetail(detail, forge),
    forge,
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

export const findPullRequestSubject = async (key: ReviewKey, context: ProcedureContext): Promise<PullRequestSubject | null> => {
  const subject = await findReviewSubject(key, context)
  return subject !== null && isPullRequestSubject(subject) ? subject : null
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

const readBranchLinking = async (subject: ReviewSubject, context: ProcedureContext): Promise<BranchLinking | null> => {
  const { target } = subject
  if (!subject.isOwn || target.kind !== "branch" || subject.artifact === null) return null
  return { branch: target, pullRequests: await listLinkablePullRequests(subject.repository, target.name, context) }
}

export const getReview = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewPage | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const subject = await findReviewSubject(key, context)
  if (subject === null) return null
  const [marks, pendingComments, publications, publishingRequest, setup, activity, branchLinking, conversation] = await Promise.all([
    subject.isOwn ? NO_REVIEWED_MARKS : context.reviewStore.readReviewedMarks(key),
    context.reviewStore.readPendingComments(key),
    context.reviewStore.readPublications(key),
    context.reviewStore.readPublishingRequest(key),
    context.setupStore.read(),
    readWritingActivity(subject, key, context),
    readBranchLinking(subject, context),
    context.conversationEnvironment.store.read(key),
  ])
  const { artifact } = subject
  const agentModels = artifact === null ? await listModelsOf(installedAgentsOf(setup.agents), context.setupEnvironment) : {}
  const configurations = artifact === null ? listConfigurationsOf(await context.configurationStore.read()) : NO_CONFIGURATIONS
  const highlighted = artifact === null ? NOTHING_HIGHLIGHTED : await highlightReview(artifact, context.highlightCode)
  return buildReviewPage(
    {
      ...subject,
      marks,
      branchLinking,
      pendingComments,
      publications,
      isPublishing: isPublishingUnderway(publishingRequest, publications, context.conversationEnvironment.agents.find(key) !== null, context.now()),
      now: context.now(),
      setup,
      configurations,
      startableAgents: startableAgentsOf(context.conversationEnvironment.spawners),
      agentModels,
      activity,
      chatLinkIds: codeLinkIdsIn(messageBodiesOf(conversation.journal)),
      ...highlighted,
    },
    input,
  )
}
