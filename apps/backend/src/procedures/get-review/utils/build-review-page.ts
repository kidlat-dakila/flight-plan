import { reviewPreferencesOf, type ArrangedSection } from "@/procedures/get-review-preferences/utils/review-preferences"
import type { Setup } from "@/procedures/get-setup/utils/setup"
import type { LineColor } from "@/procedures/list-repositories/utils/line-color"
import type { Repository, ReviewTarget } from "@/procedures/list-repositories/utils/repository"
import type { MigrationNotice } from "@/procedures/migrate-review/utils/migration-notice"
import {
  buildBlast,
  buildSegmentTrace,
  buildWalkthrough,
  buildWalkthroughControls,
  isUntitledSegment,
  prepareReviewView,
  segmentHeadingOf,
  segmentScopeOf,
  segmentTitleOf,
  selectFilterKeys,
  shownSegmentHeadingOf,
  summarizeWalkthroughFiles,
  type BlobLinker,
  type HighlightedSource,
  type PreparedSegment,
  type ReviewView,
  type WalkthroughRequest,
} from "@flightplan/codegraph"
import type { ReviewArtifact, Segment, TokenLine, WalkthroughControls } from "@flightplan/configurations"
import type { ReviewedMarks } from "@flightplan/reviewed-marks"
import { buildCompleteAction, type BranchLinking } from "./build-complete-action"
import { buildCreation, buildCreationExplorer } from "./build-creation"
import { buildFileExplorer, diffTypesOf, selectedFilterLabelsOf } from "./build-file-explorer"
import { buildStaleNotice } from "./build-notices"
import { buildCompletionNotice, buildProgress, isWritingNow, type WritingActivity } from "./build-progress"
import { buildRail } from "./build-rail"
import { buildShell, NO_REVIEWER_REQUESTS, type ReviewerRequestAbilities } from "./build-shell"
import { branchNameOf } from "./change-reader"
import { buildContext } from "./context"
import { countLabel } from "./count-label"
import type { CreationReading } from "./creation-reading"
import {
  attachThreads,
  buildConversation,
  buildReviewDraft,
  buildSharing,
  COMPOSER_LABELS,
  threadLinesOfFile,
  type DiscussionSource,
  type PendingComment,
  type Publication,
} from "./discussion"
import { blobLinkOf, type ForgeLocation } from "./forge-links"
import type { PullRequestReading } from "./pull-request-forge"
import type { ReviewTargetDetail } from "./review-target-detail"
import type { GetReviewInput, ReviewPage, ReviewPanels, ReviewShell, SegmentOutline, SegmentView } from "./schemas"
import { buildChangedFiles } from "./start/build-changed-files"
import type { ReviewRequest } from "./start/review-request"
import { buildUnassignedFiles } from "./unassigned-files"
import { writeUpNoticesOf } from "./write-up-notices"

export interface ReviewPageSource {
  readonly repository: Repository
  readonly lineColor: LineColor
  readonly target: ReviewTarget
  readonly isOwn: boolean
  readonly isStored: boolean
  readonly branchLinking: BranchLinking | null
  readonly detail: ReviewTargetDetail | null
  readonly forge: PullRequestReading | null
  readonly artifact: ReviewArtifact | null
  readonly marks: ReviewedMarks
  readonly pendingComments: readonly PendingComment[]
  readonly publications: readonly Publication[]
  readonly isPublishing: boolean
  readonly now: Date
  readonly notice: string | null
  readonly sources: readonly HighlightedSource[]
  readonly solutionTokens: ReadonlyMap<string, readonly TokenLine[]>
  readonly setup: Setup
  readonly unavailableMessage: string | null
  readonly activity: WritingActivity
  readonly chatLinkIds: readonly string[]
  readonly request: ReviewRequest | null
}

interface SegmentSettings {
  readonly walkthroughControls: WalkthroughControls
  readonly sectionOrder: readonly ArrangedSection[]
}

interface SegmentPlace {
  readonly position: number
  readonly segmentCount: number
}

const buildOutline = (segment: Segment, { position, segmentCount }: SegmentPlace): SegmentOutline => ({
  heading: segmentHeadingOf(segment, position),
  detailLabel: countLabel(segment.changedPaths.length, "file", "files"),
  label: segment.title,
  paths: [...segment.changedPaths],
  canMoveUp: position > 1,
  canMoveDown: position < segmentCount,
})

const buildSegment = (
  prepared: PreparedSegment,
  place: SegmentPlace,
  settings: SegmentSettings,
  discussion: DiscussionSource | null,
  view: ReviewView,
): SegmentView => {
  const { segment } = prepared.walkthrough
  const { position } = place
  const { isSegmented, context } = view
  const outline = buildOutline(segment, place)
  const scope = segmentScopeOf(segment, isSegmented)
  const walkthrough = buildWalkthrough(
    prepared.walkthrough,
    scope,
    settings.walkthroughControls,
    view.stepping,
    (path) => threadLinesOfFile(discussion, path),
    context,
  )
  const fileAnchorIdByPath = new Map(walkthrough.files.map((file) => [file.path, file.anchorId] as const))
  return {
    id: segment.id,
    anchorId: `segment-${segment.id}`,
    title: isSegmented ? segmentTitleOf(segment, position) : null,
    heading: shownSegmentHeadingOf(segment, position, isSegmented),
    isTitleDraft: isSegmented && isUntitledSegment(segment),
    detailLabel: isSegmented ? outline.detailLabel : null,
    outline,
    context: buildContext(prepared.walkthrough, scope, context),
    traceDiagram: buildSegmentTrace(prepared, view),
    blastDiagram: buildBlast(segment, scope, fileAnchorIdByPath, context),
    walkthrough: attachThreads(walkthrough, discussion),
    sectionOrder: [...settings.sectionOrder],
    writeUpNotices: writeUpNoticesOf(segment, prepared.traceSegments, context.isWriting),
  }
}

const PANELS: ReviewPanels = {
  explorer: { label: "Changed files", hideLabel: "Hide changed files", showLabel: "Show changed files" },
  sections: { label: "Sections", hideLabel: "Hide sections", showLabel: "Show sections" },
  chat: { label: "Chat", hideLabel: "Hide chat", showLabel: "Show chat" },
}

const AUTHOR_LABEL = "Your Flight Plan"
const COMPLETE_STATUS = "complete"

const isUploaded = (source: Pick<ReviewPageSource, "publications">): boolean => source.publications.length > 0

const isKeptPrivate = (source: Pick<ReviewPageSource, "isOwn" | "publications">): boolean => source.isOwn && !isUploaded(source)

const isLeftToComplete = (source: ReviewPageSource, artifact: ReviewArtifact): boolean =>
  source.isOwn && artifact.status !== COMPLETE_STATUS

const BRANCH_REASON = "A branch without a code host has no review to submit."

const discussionSourceOf = (source: ReviewPageSource, artifact: ReviewArtifact): DiscussionSource | null =>
  source.forge?.kind !== "read" || isKeptPrivate(source)
    ? null
    : {
        discussion: source.forge.pullRequest.discussion,
        pendingComments: source.pendingComments,
        viewer: source.forge.pullRequest.viewer,
        abilities: source.forge.pullRequest.abilities,
        commit: artifact.commit,
        now: source.now,
      }

const unavailableReasonOf = (source: ReviewPageSource): string | null => {
  if (source.forge === null) return BRANCH_REASON
  return source.forge.kind === "unavailable" ? source.forge.reason : null
}

const reviewerRequestsOf = (source: Pick<ReviewPageSource, "forge" | "isOwn" | "publications">): ReviewerRequestAbilities =>
  source.forge?.kind === "read" && !isKeptPrivate(source) ? source.forge.pullRequest.abilities : NO_REVIEWER_REQUESTS

const placedThreadIdsOf = (segments: readonly SegmentView[]): ReadonlySet<string> =>
  new Set(segments.flatMap((segment) => segment.walkthrough.files).flatMap((file) => file.threads).map((thread) => thread.id))

const UNBUILT_HEADING = "Flight Plan could not build this review"
const UNBUILT_MESSAGE = "There is no review of this pull request or branch yet."

type ShellSource = Pick<ReviewPageSource, "repository" | "lineColor" | "target" | "detail" | "artifact" | "notice" | "isOwn" | "forge" | "publications">

const buildUnbuiltPage = (source: ShellSource, shell: ReviewShell, message: string | null): ReviewPage => ({
  kind: "missing",
  shell,
  isOwn: source.isOwn,
  changedFiles: buildChangedFiles(source.detail),
  heading: UNBUILT_HEADING,
  message: message ?? UNBUILT_MESSAGE,
})

const unreadableBranchMessageOf = (target: ReviewTarget): string =>
  `${branchNameOf(target)} is not in this checkout. Fetch it and try again.`

const shellOf = (source: ShellSource): ReviewShell =>
  buildShell(
    source.repository,
    source.lineColor,
    source.target,
    source.detail,
    source.artifact,
    source.notice,
    isKeptPrivate(source) ? AUTHOR_LABEL : null,
    reviewerRequestsOf(source),
  )

export const buildMigrationPage = (source: ShellSource, notice: MigrationNotice): ReviewPage => ({
  kind: "needs-migration",
  shell: shellOf(source),
  isOwn: source.isOwn,
  changedFiles: buildChangedFiles(source.detail),
  ...notice,
})

export const buildCreationPage = (source: ShellSource, reading: CreationReading): ReviewPage => {
  const shell = shellOf(source)
  if (reading.kind === "unreadable") return buildUnbuiltPage(source, shell, unreadableBranchMessageOf(source.target))
  return {
    kind: "creation",
    shell,
    isOwn: source.isOwn,
    panels: PANELS,
    fileExplorer: buildCreationExplorer(reading.change),
    creation: buildCreation({
      target: source.target,
      header: shell.header,
      compareBranch: reading.compareBranch,
      defaultBranch: reading.defaultBranch,
      change: reading.change,
    }),
  }
}

export const buildReviewPage = (source: ReviewPageSource, input: GetReviewInput): ReviewPage => {
  const shell = shellOf(source)
  if (source.artifact === null) return buildUnbuiltPage(source, shell, source.unavailableMessage)
  const { artifact } = source
  const forgeLocation: ForgeLocation = {
    forge: source.repository.forge,
    forgeSlug: source.repository.forgeSlug,
    commit: artifact.commit,
  }
  const linkToBlob: BlobLinker = (path, range) => blobLinkOf(forgeLocation, path, range)
  const preferences = reviewPreferencesOf(source.setup.reviewPreferences)
  const walkthroughRequest: WalkthroughRequest = {
    filterKeys: selectFilterKeys(input.filterKeys),
    isShowingReviewed: source.isOwn || input.isShowingReviewed,
  }
  const view = prepareReviewView({
    artifact,
    highlighted: { sources: source.sources, solutionTokens: source.solutionTokens },
    preferences: {
      spotlight: preferences.spotlight,
      walkthroughOrder: source.request?.writeUp?.walkthroughOrder ?? preferences.walkthroughOrder,
    },
    marks: source.marks,
    request: walkthroughRequest,
    chatLinkIds: source.chatLinkIds,
    blobLinkOf: linkToBlob,
    isWriting: isWritingNow(artifact, source.activity),
  })
  const walkthroughs = view.segments.map((prepared) => prepared.walkthrough)
  const settings: SegmentSettings = {
    walkthroughControls: buildWalkthroughControls(walkthroughs, walkthroughRequest, view.context.spotlight),
    sectionOrder: preferences.sectionOrder,
  }
  const discussion = discussionSourceOf(source, artifact)
  const segments = view.segments.map((prepared, index) =>
    buildSegment(prepared, { position: index + 1, segmentCount: view.segments.length }, settings, discussion, view))
  const hasForge = source.detail?.forgeUrl != null
  const isReviewable = !isKeptPrivate(source)
  const conversation = discussion === null ? null : buildConversation(discussion, placedThreadIdsOf(segments))
  return {
    kind: "artifact",
    shell,
    isOwn: source.isOwn,
    canMoveCards: source.isStored,
    completeAction: isLeftToComplete(source, artifact) ? buildCompleteAction(source.branchLinking, source.now) : null,
    staleNotice: buildStaleNotice(source.repository, source.target, artifact, source.detail),
    progress: buildProgress(artifact, source.activity),
    completion: buildCompletionNotice(artifact),
    unassignedFiles: buildUnassignedFiles(artifact),
    rail: buildRail(segments, conversation, false),
    segments,
    conversation,
    composer: discussion === null ? null : COMPOSER_LABELS,
    reviewDraft: isReviewable ? buildReviewDraft(discussion, unavailableReasonOf(source)) : null,
    sharing: isLeftToComplete(source, artifact) ? null : buildSharing(source.publications, hasForge, source.now, source.isPublishing),
    panels: PANELS,
    fileExplorer: buildFileExplorer({
      changedPaths: artifact.changedPaths,
      diffTypes: diffTypesOf(artifact),
      summaries: walkthroughs.flatMap(summarizeWalkthroughFiles),
      anchorIdByPath: new Map(segments.flatMap((segment) => segment.walkthrough.files).map((file) => [file.path, file.anchorId] as const)),
      filterValues: selectedFilterLabelsOf(settings.walkthroughControls.filter),
    }),
    codeLinks: view.codeLinks,
    codeDefinitions: view.codeDefinitions,
  }
}
