import type { ProcedureContext } from "@/procedures/context"
import { messageBodiesOf } from "@/procedures/get-conversation/utils/conversation"
import { isAgentOnlineFor } from "@/procedures/get-conversation/utils/conversation-actions"
import { selfAuthorIdOf } from "@/procedures/get-setup/utils/git-identity"
import { updateCommandOf } from "@/procedures/get-update-notice/utils/update-notice"
import { lineColorAt } from "@/procedures/list-repositories/utils/line-color"
import { listLinkablePullRequests } from "@/procedures/mark-complete/utils/linkable-pull-requests"
import { migrationNoticeOf } from "@/procedures/migrate-review/utils/migration-notice"
import type { UnmigratedState } from "@/procedures/migrate-review/utils/review-version"
import { readReviewVersionState } from "@/procedures/migrate-review/utils/stored-version-state"
import { isPublishingUnderway } from "@/procedures/publish-artifact/utils/publishing-progress"
import { codeLinkIdsIn, highlightReview, type HighlightedReview } from "@flightplan/codegraph"
import type { ReviewArtifact } from "@flightplan/configurations"
import { NO_REVIEWED_MARKS } from "@flightplan/reviewed-marks"
import { readBranchAuthorEmail } from "./utils/branch-author"
import type { BranchLinking } from "./utils/build-complete-action"
import { NO_WRITING_ACTIVITY, type WritingActivity } from "./utils/build-progress"
import { buildMigrationPage, buildReviewPage } from "./utils/build-review-page"
import { branchNameOf } from "./utils/change-reader"
import { findReviewTarget } from "./utils/find-review-target"
import { readLiveTargetDetail, withForgeDetail } from "./utils/live-target-detail"
import { buildOpeningArtifact, isOpenedWithoutArtifact } from "./utils/opening-scaffold"
import { isOwnTarget } from "./utils/own-target"
import { refreshArtifact } from "./utils/refresh-artifact"
import { isPullRequestSubject, type PullRequestSubject } from "./utils/review-action"
import type { ReviewKey } from "./utils/review-store"
import type { ReviewSubject } from "./utils/review-subject"
import type { GetReviewInput, ReviewPage } from "./utils/schemas"
import { buildReviewPrompt } from "./utils/start/review-prompt"

const NOTHING_HIGHLIGHTED: HighlightedReview = { sources: [], solutionTokens: new Map() }

type ArtifactReader = (key: ReviewKey) => Promise<ReviewArtifact | null>

const readNoArtifact: ArtifactReader = async () => await Promise.resolve(null)

const findListedSubject = async (key: ReviewKey, context: ProcedureContext, readArtifact: ArtifactReader): Promise<ReviewSubject | null> => {
  const repositories = await context.repositoryStore.list()
  const repository = repositories.find((candidate) => candidate.name === key.repositoryName)
  if (repository === undefined) return null
  const target = await findReviewTarget(repository, key.targetId, context)
  if (target === null) return null
  const [artifact, sampleDetail, viewerLogin, branchAuthorEmail, gitIdentity, forge] = await Promise.all([
    readArtifact(key),
    context.reviewStore.findTargetDetail(key),
    context.repositoryStore.readViewerLogin(repository.name),
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
      selfAuthorId: selfAuthorIdOf(gitIdentity),
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

export const findReviewSubject = async (
  key: ReviewKey,
  context: ProcedureContext,
  readArtifact: ArtifactReader = context.reviewStore.findArtifact,
): Promise<ReviewSubject | null> =>
  (await findListedSubject(key, context, readArtifact)) ?? (await findFixtureSubject(key, context))

export const findPullRequestSubject = async (key: ReviewKey, context: ProcedureContext): Promise<PullRequestSubject | null> => {
  const subject = await findReviewSubject(key, context)
  return subject !== null && isPullRequestSubject(subject) ? subject : null
}

const readWritingActivity = async (subject: ReviewSubject, key: ReviewKey, context: ProcedureContext): Promise<WritingActivity> => {
  if (subject.artifact?.status !== "drafting") return NO_WRITING_ACTIVITY
  const request = await context.reviewStore.findRequest(key)
  return {
    request,
    isAgentOnline: isAgentOnlineFor(key, context),
    prompt: request === null ? null : buildReviewPrompt(subject.repository, subject.target, key, request.writeUp),
  }
}

const readBranchLinking = async (subject: ReviewSubject, context: ProcedureContext): Promise<BranchLinking | null> => {
  const { target } = subject
  if (!subject.isOwn || target.kind !== "branch" || subject.artifact === null) return null
  return { branch: target, pullRequests: await listLinkablePullRequests(subject.repository, target.name, context) }
}

interface OpenedArtifact {
  readonly artifact: ReviewArtifact | null
  readonly unavailableMessage: string | null
}

const openedArtifactOf = async (subject: ReviewSubject, key: ReviewKey, context: ProcedureContext): Promise<OpenedArtifact> => {
  if (!isOpenedWithoutArtifact(subject)) return { artifact: await refreshArtifact(subject, key, context), unavailableMessage: null }
  const opening = await buildOpeningArtifact(subject, key, context)
  return opening.kind === "built" ? { artifact: opening.artifact, unavailableMessage: null } : { artifact: null, unavailableMessage: opening.message }
}

const updateCommandFor = (context: ProcedureContext): string | null =>
  context.updateChecker === undefined ? null : updateCommandOf(context.updateChecker.installPath)

const getMigrationPage = async (key: ReviewKey, state: UnmigratedState, context: ProcedureContext): Promise<ReviewPage | null> => {
  const [subject, publications] = await Promise.all([findReviewSubject(key, context, readNoArtifact), context.reviewStore.readPublications(key)])
  return subject === null ? null : buildMigrationPage({ ...subject, publications }, migrationNoticeOf(state, updateCommandFor(context)))
}

export const getReview = async (input: GetReviewInput, context: ProcedureContext): Promise<ReviewPage | null> => {
  const key = { repositoryName: input.repositoryName, targetId: input.targetId }
  const versionState = await readReviewVersionState(key, context)
  if (versionState.kind !== "current") return await getMigrationPage(key, versionState, context)
  const found = await findReviewSubject(key, context)
  if (found === null) return null
  const opened = await openedArtifactOf(found, key, context)
  const subject = { ...found, artifact: opened.artifact }
  const [marks, pendingComments, publications, publishingRequest, setup, activity, branchLinking, conversation, request] = await Promise.all([
    subject.isOwn ? NO_REVIEWED_MARKS : context.reviewStore.readReviewedMarks(key),
    context.reviewStore.readPendingComments(key),
    context.reviewStore.readPublications(key),
    context.reviewStore.readPublishingRequest(key),
    context.setupStore.read(),
    readWritingActivity(subject, key, context),
    readBranchLinking(subject, context),
    context.conversationEnvironment.store.read(key),
    context.reviewStore.findRequest(key),
  ])
  const { artifact } = subject
  const highlighted = artifact === null ? NOTHING_HIGHLIGHTED : await highlightReview(artifact, context.highlightCode)
  return buildReviewPage(
    {
      ...subject,
      marks,
      branchLinking,
      pendingComments,
      publications,
      isPublishing: isPublishingUnderway(publishingRequest, publications, isAgentOnlineFor(key, context), context.now()),
      now: context.now(),
      setup,
      unavailableMessage: opened.unavailableMessage,
      activity,
      request,
      chatLinkIds: codeLinkIdsIn(messageBodiesOf(conversation.journal)),
      ...highlighted,
    },
    input,
  )
}
