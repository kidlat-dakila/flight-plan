import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, useNavigate, type ErrorComponentProps } from "@tanstack/react-router"
import { lazy, Suspense, use, useState } from "react"
import { createPortal } from "react-dom"
import { BandSlotContext } from "@/band-slot"
import { requestNotificationPermission } from "@/notification-permission"
import ServerError from "@/routes/-components/ServerError"
import { useTRPC } from "@/trpc"
import BandLine from "@flightplan/ui/BandLine"
import BlastBand from "@flightplan/ui/BlastBand"
import Button from "@flightplan/ui/blocks/button"
import ChatPanel from "@flightplan/ui/ChatPanel"
import CodeWalkthrough from "@flightplan/ui/CodeWalkthrough"
import type { CommentEditorRequest } from "@flightplan/ui/CommentThread"
import FileSection from "@flightplan/ui/FileSection"
import GenerationOffer from "@flightplan/ui/GenerationOffer"
import JourneyBand from "@flightplan/ui/JourneyBand"
import { useCurrentAnchor } from "@flightplan/ui/lib/use-current-anchor"
import { cn } from "@flightplan/ui/lib/utils"
import { WritingContext } from "@flightplan/ui/lib/writing-context"
import SubmitReviewMenu, { BandButton, BandHint, CompleteButton, OptionsMenu, ShareMenu, type PublicationKind } from "@flightplan/ui/ReviewActions"
import ReviewHeader from "@flightplan/ui/ReviewHeader"
import ReviewNavigator, { ReviewNavigatorBar } from "@flightplan/ui/ReviewNavigator"
import SectionRail from "@flightplan/ui/SectionRail"
import Toast from "@flightplan/ui/Toast"
import AddCardDialog from "./-components/AddCardDialog"
import ArrangeDialog from "./-components/ArrangeDialog"
import CodeLinkDialog from "./-components/CodeLinkDialog"
import CompletionDialog from "./-components/CompletionDialog"
import ContextBand from "./-components/ContextBand"
import ConversationBand from "./-components/ConversationBand"
import OwnFlightPlanStart from "./-components/OwnFlightPlanStart"
import PermissionDialog from "./-components/PermissionDialog"
import RebuildReviewDialog from "./-components/RebuildReviewDialog"
import ReviewNotices from "./-components/ReviewNotices"
import SegmentEditor from "./-components/SegmentEditor"
import SegmentHeader from "./-components/SegmentHeader"
import SelectionReference, { type CodeSelection } from "./-components/SelectionReference"
import StartReview from "./-components/StartReview"
import UnassignedFilesDialog from "./-components/UnassignedFilesDialog"
import WalkthroughFile from "./-components/WalkthroughFile"
import { useAgentChat } from "./-hooks/use-agent-chat"
import { useCodeSelection } from "./-hooks/use-code-selection"
import { useCompletionNotification } from "./-hooks/use-completion-notification"
import { useContextEditing } from "./-hooks/use-context-editing"
import { useJourneyEditing } from "./-hooks/use-journey-editing"
import { useReviewDiscussion } from "./-hooks/use-review-discussion"
import { useSectionGeneration } from "./-hooks/use-section-generation"
import { useSegmentEditing } from "./-hooks/use-segment-editing"
import { useTargetSwitching } from "./-hooks/use-target-switching"
import { useToast } from "./-hooks/use-toast"
import { useWalkthroughEditing } from "./-hooks/use-walkthrough-editing"
import { useWalkthroughNavigation } from "./-hooks/use-walkthrough-navigation"
import { scrollToAnchor, useWaypointStepping } from "./-hooks/use-waypoint-stepping"

const ModifyCardDialog = lazy(async () => await import("./-components/ModifyCardDialog"))
const BlastImpactEditor = lazy(async () => await import("./-components/BlastImpactEditor"))
const ContextEditor = lazy(async () => await import("./-components/ContextEditor"))
const CommentEditor = lazy(async () => await import("./-components/CommentEditor"))

const REFRESH_INTERVAL_MS = 5000
const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."
const COPY_FAILED_MESSAGE = "Could not copy to the clipboard"
const REBUILD_FORM_LOADING_LABEL = "Loading the options…"
const EDITOR_LOADING_LABEL = "Loading the editor…"
const ADD_SEGMENT_LABEL = "Add a segment"
const NEW_SEGMENT_LEGEND = "New segment"
const NO_SEGMENTS_MESSAGE = "This Flight Plan has no segments yet."
const PUBLISH_ANYWAY_LABEL = "Publish anyway"
const ARRANGE_SEGMENTS_TITLE = "Arrange segments"
const ARRANGE_SEGMENTS_DESCRIPTION = "Move a segment up or down. The order is saved as you go."
const ARRANGE_FILES_TITLE = "Arrange files"
const ARRANGE_FILES_DESCRIPTION = "Move a file up or down in the Code Walkthrough. The order is saved as you go."
const NO_PATHS: readonly string[] = []
const NO_SEGMENTS: readonly never[] = []
const ACCENT_LINE_CLASS = "[--line:var(--primary-text)]"
const LAYOUT_VARIABLES = "[--band-height:3.5rem] [--section-scroll-margin:4.5rem] [--file-header-top:3.5rem] [--waypoint-scroll-margin:7rem] [--chat-width:26rem]"

export interface ReviewSearch {
  readonly filter?: string[] | undefined
  readonly reviewed?: boolean | undefined
}

export interface ReviewParams {
  readonly repoName: string
  readonly branchId: string
}

type UnassignedFilesPrompt
  = | { readonly kind: "list" }
    | { readonly kind: "publish", readonly destination: PublicationKind }

interface ReviewPageProps {
  readonly params: ReviewParams
  readonly search: ReviewSearch
  readonly onSearchChange: (change: ReviewSearch) => void
}

const renderCommentEditor = (request: CommentEditorRequest) => (
  <Suspense fallback={<p className="text-sm text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
    <CommentEditor {...request} />
  </Suspense>
)

export const reviewRequestOf = (params: ReviewParams, search: ReviewSearch) => ({
  repositoryName: params.repoName,
  targetId: params.branchId,
  filterKeys: search.filter ?? null,
  isShowingReviewed: search.reviewed ?? false,
})

export const ReviewPage = ({ params, search, onSearchChange }: ReviewPageProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const bandSlot = use(BandSlotContext)
  const reviewKey = { repositoryName: params.repoName, targetId: params.branchId }
  const { data: page } = useSuspenseQuery({
    ...trpc.review.get.queryOptions(reviewRequestOf(params, search)),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  })
  const [rebuildMode, setRebuildMode] = useState<"update" | "regenerate" | null>(null)
  const [unassignedFilesPrompt, setUnassignedFilesPrompt] = useState<UnassignedFilesPrompt | null>(null)
  const [isArranging, setIsArranging] = useState(false)
  const [isChoosingPullRequest, setIsChoosingPullRequest] = useState(false)
  const [arrangedWalkthroughSegmentId, setArrangedWalkthroughSegmentId] = useState<string | null>(null)
  const [toastMessage, showToast] = useToast()
  const { isOwn } = page
  const progress = page.kind === "artifact" ? page.progress : null
  const permission = progress?.permission ?? null
  useCompletionNotification(
    `${params.repoName}/${params.branchId}`,
    progress !== null,
    page.kind === "artifact" ? page.completion : null,
    showToast,
  )
  const codeSelection = useCodeSelection()
  const contextEditingOf = useContextEditing(reviewKey)
  const segmentEditing = useSegmentEditing(reviewKey, showToast)
  const journeyEditing = useJourneyEditing(reviewKey, showToast)
  const walkthroughEditing = useWalkthroughEditing(reviewKey, showToast)
  const sectionGeneration = useSectionGeneration(reviewKey, showToast)
  const discussion = useReviewDiscussion(reviewKey, showToast)
  const chat = useAgentChat(reviewKey, showToast)
  const targetSwitching = useTargetSwitching(reviewKey)

  const rebuildForm = useQuery({
    ...trpc.review.rebuildForm.queryOptions({ ...reviewKey, mode: rebuildMode ?? "update" }),
    enabled: rebuildMode !== null,
    gcTime: 0,
  })

  const refreshReview = async (): Promise<void> => {
    await queryClient.invalidateQueries(trpc.review.get.pathFilter())
  }
  const reportError = (error: { readonly message: string }): void => {
    showToast(error.message)
  }
  const copyText = (text: string, copiedMessage: string): void => {
    navigator.clipboard.writeText(text).then(
      () => {
        showToast(copiedMessage)
      },
      () => {
        showToast(COPY_FAILED_MESSAGE)
      },
    )
  }

  const setReviewed = useMutation(trpc.review.setReviewed.mutationOptions({ onSuccess: refreshReview, onError: reportError }))
  const publishArtifact = useMutation(
    trpc.review.publish.mutationOptions({
      onSuccess: async ({ message }) => {
        showToast(message)
        await refreshReview()
      },
      onError: reportError,
    }),
  )
  const markComplete = useMutation(
    trpc.review.markComplete.mutationOptions({
      onSuccess: async ({ message, targetId }) => {
        showToast(message)
        setIsChoosingPullRequest(false)
        await refreshReview()
        if (targetId !== params.branchId) {
          void navigate({ to: "/pr-reviews/$repoName/$branchId", params: { repoName: params.repoName, branchId: targetId } })
        }
      },
      onError: reportError,
    }),
  )
  const requestReview = useMutation(
    trpc.review.request.mutationOptions({
      onSuccess: async (result) => {
        if (result.kind !== "requested") return
        if (result.prompt === null) showToast(result.message)
        else copyText(result.prompt, result.message)
        await refreshReview()
      },
    }),
  )
  const rebuildReview = useMutation(
    trpc.review.rebuild.mutationOptions({
      onSuccess: async (result) => {
        if (result.kind !== "rebuilt") return
        setRebuildMode(null)
        if (result.prompt === null) showToast(result.message)
        else copyText(result.prompt, result.message)
        await refreshReview()
      },
    }),
  )
  const deleteReview = useMutation(
    trpc.review.delete.mutationOptions({
      onSuccess: async ({ message }) => {
        showToast(message)
        await Promise.all([refreshReview(), queryClient.invalidateQueries(trpc.review.creationForm.pathFilter())])
      },
      onError: reportError,
    }),
  )
  const openRebuildDialog = (mode: "update" | "regenerate"): void => {
    rebuildReview.reset()
    setRebuildMode(mode)
  }

  const artifact = page.kind === "artifact" ? page : null
  const arrangedWalkthroughSegment = artifact?.segments.find((segment) => segment.id === arrangedWalkthroughSegmentId) ?? null
  const stepping = useWaypointStepping(artifact?.segments ?? NO_SEGMENTS, artifact?.walkthroughControls.stepping ?? null)
  const { openWaypointIds, currentWaypointId } = stepping
  const handleOpenCodeLink = stepping.onOpenCodeLink
  const handleToggleWaypoint = stepping.onToggleWaypoint
  const railSections = [...(artifact?.rail.groups.flatMap((group) => group.sections) ?? []), ...(artifact?.rail.sections ?? [])]
  const currentAnchorId = useCurrentAnchor(
    railSections.flatMap((section) => [section.anchorId, ...section.children.map((child) => child.anchorId)]),
  )
  const walkthroughLayout = useWalkthroughNavigation(artifact?.segments ?? NO_SEGMENTS, stepping, currentAnchorId, {
    onReviewedChange: isOwn
      ? null
      : (id, isReviewed) => {
          setReviewed.mutate({ ...reviewKey, subject: { kind: "waypoint", id }, isReviewed })
        },
    onFilterChange: (keys) => {
      onSearchChange({ filter: keys === null ? undefined : [...keys] })
    },
    onShowReviewedChange: isOwn ? null : (isShown) => { onSearchChange({ reviewed: isShown ? true : undefined }) },
  })

  const handleEditRailGroup = (anchorId: string): void => {
    const segment = artifact?.segments.find((candidate) => candidate.anchorId === anchorId)
    if (segment === undefined) return
    segmentEditing.authoringOf(segment.id).writing.onEdit()
    scrollToAnchor(anchorId)
  }

  const withCodeReference = (
    selection: CodeSelection,
    onResolved: (reference: { readonly reference: string }) => void,
  ): void => {
    queryClient
      .query({
        ...trpc.review.codeReference.queryOptions({
          ...reviewKey,
          path: selection.path,
          lineStart: selection.lineStart,
          lineEnd: selection.lineEnd,
        }),
        staleTime: "static",
      })
      .then(onResolved, (error: unknown) => {
        showToast(error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE)
      })
  }

  return (
    <div
      className={cn(
        "px-6 pb-24 transition-[margin] duration-200 ease-out",
        chat.isOpen ? "mr-(--chat-width) [--navigator-inset-right:var(--chat-width)]" : "",
        ACCENT_LINE_CLASS,
        LAYOUT_VARIABLES,
      )}
    >
      <title>{page.shell.documentTitle}</title>
      {bandSlot === null
        ? null
        : createPortal(
            <>
              <BandLine lineColor="primary" />
              <ReviewHeader
                header={page.shell.header}
                changedFiles={page.kind === "missing" ? page.changedFiles : null}
                authorLabel={page.shell.authorLabel}
                reviewerRequesting={discussion.reviewerRequesting}
                targetSwitching={targetSwitching}
                actions={page.kind === "missing"
                  ? null
                  : (
                      <>
                        <BandButton
                          label={page.chatLabel}
                          isPressed={chat.isOpen}
                          onClick={chat.onToggle}
                        />
                        {!isOwn || page.unassignedFiles === null
                          ? null
                          : <BandHint label={page.unassignedFiles.label} onClick={() => { setUnassignedFilesPrompt({ kind: "list" }) }} />}
                        {page.completeAction === null
                          ? null
                          : (
                              <CompleteButton
                                label={page.completeAction.label}
                                isPending={markComplete.isPending}
                                onClick={() => {
                                  if (page.completeAction?.pullRequestChoice == null) markComplete.mutate({ ...reviewKey, pullRequestTargetId: null })
                                  else setIsChoosingPullRequest(true)
                                }}
                              />
                            )}
                        {page.sharing === null
                          ? null
                          : (
                              <ShareMenu
                                sharing={page.sharing}
                                publishingKey={publishArtifact.isPending ? publishArtifact.variables.destination : null}
                                onPublish={(destination) => {
                                  if (page.unassignedFiles === null) publishArtifact.mutate({ ...reviewKey, destination })
                                  else setUnassignedFilesPrompt({ kind: "publish", destination })
                                }}
                              />
                            )}
                        {page.reviewDraft === null
                          ? null
                          : (
                              <SubmitReviewMenu
                                draft={page.reviewDraft}
                                isSubmitting={discussion.isSubmitting}
                                isDiscarding={discussion.isDiscarding}
                                errorMessage={discussion.submissionError}
                                submissionCount={discussion.submissionCount}
                                renderEditor={renderCommentEditor}
                                onSubmit={discussion.onSubmit}
                                onDiscard={discussion.onDiscardComment}
                              />
                            )}
                        <OptionsMenu
                          forgeLink={page.shell.header.kind === "pull-request" ? page.shell.header.forgeLink : null}
                          rebuild={isOwn
                            ? null
                            : {
                                onUpdate: () => { openRebuildDialog("update") },
                                onRegenerate: () => { openRebuildDialog("regenerate") },
                              }}
                          onDelete={() => { deleteReview.mutate(reviewKey) }}
                        />
                      </>
                    )}

              />
            </>,
            bandSlot,
          )}
      <RebuildReviewDialog
        isOpen={rebuildMode !== null}
        rebuildForm={rebuildForm.isFetching ? null : rebuildForm.data ?? null}
        loadingLabel={REBUILD_FORM_LOADING_LABEL}
        problem={rebuildReview.data?.kind === "rejected" ? rebuildReview.data : null}
        errorMessage={rebuildReview.data?.kind === "unavailable" ? rebuildReview.data.message : rebuildReview.error?.message ?? rebuildForm.error?.message ?? null}
        isPending={rebuildReview.isPending}
        onSubmit={(choice) => {
          if (rebuildMode === null) return
          requestNotificationPermission()
          rebuildReview.mutate({ ...reviewKey, ...choice, mode: rebuildMode })
        }}
        onClose={() => { setRebuildMode(null) }}
      />
      {page.kind === "missing" && isOwn
        ? (
            <Suspense fallback={null}>
              <OwnFlightPlanStart repositoryName={params.repoName} targetId={params.branchId} />
            </Suspense>
          )
        : null}
      {page.kind === "missing" && !isOwn
        ? (
            <StartReview
              heading={page.heading}
              message={page.message}
              form={page.form}
              problem={requestReview.data?.kind === "rejected" ? requestReview.data : null}
              errorMessage={requestReview.data?.kind === "unavailable" ? requestReview.data.message : requestReview.error?.message ?? null}
              isPending={requestReview.isPending}
              dataNotice={page.shell.notice}
              onSubmit={(choice) => {
                requestNotificationPermission()
                requestReview.mutate({ ...reviewKey, ...choice })
              }}
            />
          )
        : null}
      {page.kind === "missing"
        ? null
        : (
            <ReviewNavigator rail={page.rail}>
              <WritingContext value={page.progress?.isWriting === true ? page.progress.label : null}>
                <ReviewNotices
                  staleNotice={page.staleNotice}
                  unassignedFiles={isOwn ? null : page.unassignedFiles}
                  progress={page.progress}
                  onShowUnassignedFiles={() => { setUnassignedFilesPrompt({ kind: "list" }) }}
                  onCopyPrompt={copyText}
                />
                <div className="grid grid-cols-[13rem_minmax(0,1fr)] gap-x-8">
                  <aside className="sticky top-[calc(var(--band-height)+0.5rem)] max-h-[calc(100dvh-var(--band-height)-1rem)] self-start overflow-y-auto pt-5 pb-4">
                    <SectionRail
                      label="Review sections"
                      groups={page.rail.groups}
                      sections={page.rail.sections}
                      currentAnchorId={currentAnchorId}
                      onEditGroup={isOwn ? handleEditRailGroup : null}
                      onArrangeGroups={isOwn && page.segments.some((segment) => segment.outline.canMoveUp) ? () => { setIsArranging(true) } : null}
                    />
                  </aside>
                  <div className="min-w-0">
                    {page.segments.map((segment) => (
                      <section
                        key={segment.id}
                        id={segment.anchorId}
                        aria-label={(isOwn ? segment.outline.heading : segment.heading) ?? undefined}
                        className="scroll-mt-(--section-scroll-margin) not-first:border-t-4 not-first:border-foreground"
                      >
                        <SegmentHeader
                          reviewKey={reviewKey}
                          heading={segment.heading}
                          isTitleDraft={segment.isTitleDraft}
                          detailLabel={segment.detailLabel}
                          outline={segment.outline}
                          authoring={isOwn ? segmentEditing.authoringOf(segment.id) : null}
                        />
                        <ContextBand
                          {...segment.context}
                          codeLinks={page.codeLinks}
                          editing={isOwn ? contextEditingOf(segment.id) : null}
                          renderCodeLinkDialog={(request) => <CodeLinkDialog reviewKey={reviewKey} {...request} />}
                          onOpenCodeLink={handleOpenCodeLink}
                        />
                        {segment.offers.journey === null
                          ? (
                              <JourneyBand
                                {...segment.journey}
                                codeLinks={page.codeLinks}
                                codeDefinitions={page.codeDefinitions}
                                isReviewPending={setReviewed.isPending}
                                authoring={isOwn ? journeyEditing.authoringOf(segment.id) : null}
                                renderDescriptionEditor={isOwn
                                  ? (request) => (
                                      <Suspense fallback={<p className="text-sm text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
                                        <ContextEditor {...request} renderCodeLinkDialog={(linkRequest) => <CodeLinkDialog reviewKey={reviewKey} {...linkRequest} />} />
                                      </Suspense>
                                    )
                                  : null}
                                onOpenCodeLink={handleOpenCodeLink}
                                onWaypointReviewedChange={isOwn
                                  ? null
                                  : (id, isReviewed) => {
                                      setReviewed.mutate({ ...reviewKey, subject: { kind: "waypoint", id }, isReviewed })
                                    }}
                              />
                            )
                          : (
                              <GenerationOffer
                                kind="board"
                                {...segment.offers.journey}
                                isGenerating={sectionGeneration.generatingSection === segment.offers.journey.section}
                                errorMessage={sectionGeneration.errorMessageOf(segment.offers.journey.section)}
                                onGenerate={() => { sectionGeneration.onGenerate("journey") }}
                              />
                            )}
                        {segment.offers.blast === null
                          ? null
                          : (
                              <GenerationOffer
                                kind="board"
                                {...segment.offers.blast}
                                isGenerating={sectionGeneration.generatingSection === segment.offers.blast.section}
                                errorMessage={sectionGeneration.errorMessageOf(segment.offers.blast.section)}
                                onGenerate={() => { sectionGeneration.onGenerate("blast") }}
                              />
                            )}
                        {segment.blast === null
                          ? null
                          : (
                              <BlastBand
                                {...segment.blast}
                                codeLinks={page.codeLinks}
                                renderImpactEditor={isOwn
                                  ? (request) => (
                                      <Suspense fallback={<p className="text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
                                        <BlastImpactEditor
                                          key={request.path}
                                          {...request}
                                          reviewKey={reviewKey}
                                          renderCodeLinkDialog={(linkRequest) => <CodeLinkDialog reviewKey={reviewKey} {...linkRequest} />}
                                        />
                                      </Suspense>
                                    )
                                  : null}
                                onOpenCodeLink={handleOpenCodeLink}
                                onOpenFile={handleOpenCodeLink}
                              />
                            )}
                        <CodeWalkthrough
                          anchorId={segment.walkthrough.anchorId}
                          heading={segment.walkthrough.heading}
                          coverageLabel={segment.walkthrough.coverageLabel}
                          emptyMessage={segment.walkthrough.emptyMessage}
                          navigation={walkthroughLayout.navigationOf(segment, page.walkthroughControls)}
                          onArrangeFiles={isOwn && segment.walkthrough.fileOrder.length > 1
                            ? () => { setArrangedWalkthroughSegmentId(segment.id) }
                            : null}
                        >
                          {segment.offers.findings === null
                            ? null
                            : (
                                <GenerationOffer
                                  kind="notice"
                                  {...segment.offers.findings}
                                  isGenerating={sectionGeneration.generatingSection === segment.offers.findings.section}
                                  errorMessage={sectionGeneration.errorMessageOf(segment.offers.findings.section)}
                                  onGenerate={() => { sectionGeneration.onGenerate("findings") }}
                                />
                              )}
                          {isOwn
                            ? segment.walkthrough.files.map((file) => (
                                <WalkthroughFile
                                  key={file.anchorId}
                                  reviewKey={reviewKey}
                                  segmentId={segment.id}
                                  file={file}
                                  openWaypointIds={openWaypointIds}
                                  currentWaypointId={currentWaypointId}
                                  isCollapsed={walkthroughLayout.isFileCollapsed(file.anchorId)}
                                  areWaypointsHidden={walkthroughLayout.areWaypointsHidden}
                                  isPending={walkthroughEditing.isPending}
                                  codeLinks={page.codeLinks}
                                  renderCodeLinkDialog={(request) => <CodeLinkDialog reviewKey={reviewKey} {...request} />}
                                  onOpenCodeLink={handleOpenCodeLink}
                                  onToggleWaypoint={handleToggleWaypoint}
                                  onCollapsedChange={(isCollapsed) => { walkthroughLayout.onFileCollapsedChange(file.anchorId, isCollapsed) }}
                                  onRemove={() => { walkthroughEditing.onRemoveFile(segment.id, file.path) }}
                                  onRemoveWaypoint={(waypointId) => { walkthroughEditing.onRemoveWaypoint(segment.id, waypointId) }}
                                />
                              ))
                            : segment.walkthrough.files.map((file) => (
                                <FileSection
                                  key={file.anchorId}
                                  file={file}
                                  openWaypointIds={openWaypointIds}
                                  currentWaypointId={currentWaypointId}
                                  focusedWaypointId={stepping.focusedWaypointId}
                                  isCollapsed={walkthroughLayout.isFileCollapsed(file.anchorId)}
                                  areWaypointsHidden={walkthroughLayout.areWaypointsHidden}
                                  isReviewPending={setReviewed.isPending}
                                  composer={page.composer}
                                  composingRange={discussion.composingRangeOf(file.path)}
                                  isCommentPending={discussion.isCommentPending}
                                  renderCommentEditor={renderCommentEditor}
                                  codeLinks={page.codeLinks}
                                  codeDefinitions={page.codeDefinitions}
                                  onOpenCodeLink={handleOpenCodeLink}
                                  onToggleWaypoint={handleToggleWaypoint}
                                  onCollapsedChange={(isCollapsed) => { walkthroughLayout.onFileCollapsedChange(file.anchorId, isCollapsed) }}
                                  onWaypointReviewedChange={(id, isReviewed) => {
                                    setReviewed.mutate({ ...reviewKey, subject: { kind: "waypoint", id }, isReviewed })
                                  }}
                                  onFileReviewedChange={(path, isReviewed) => {
                                    setReviewed.mutate({ ...reviewKey, subject: { kind: "file", path }, isReviewed })
                                  }}
                                  onStartComment={discussion.onStartComment}
                                  onAddComment={discussion.onAddComment}
                                  onPostComment={discussion.onPostComment}
                                  onReply={discussion.onReply}
                                  onResolveThread={discussion.onResolveThread}
                                  onDiscardComment={discussion.onDiscardComment}
                                />
                              ))}
                        </CodeWalkthrough>
                      </section>
                    ))}
                    {isOwn && page.segments.length === 0 && !segmentEditing.addition.isWriting
                      ? <p className="pt-6 text-muted-foreground">{NO_SEGMENTS_MESSAGE}</p>
                      : null}
                    {isOwn && segmentEditing.addition.isWriting
                      ? (
                          <SegmentEditor
                            reviewKey={reviewKey}
                            legend={NEW_SEGMENT_LEGEND}
                            label=""
                            paths={NO_PATHS}
                            isSaving={segmentEditing.addition.isSaving}
                            isDeleting={false}
                            errorMessage={segmentEditing.addition.errorMessage}
                            onSave={segmentEditing.addition.onSave}
                            onDelete={null}
                            onClose={segmentEditing.addition.onCancel}
                          />
                        )
                      : null}
                    {isOwn && !segmentEditing.addition.isWriting
                      ? <Button variant="outline" className="mt-6" onClick={segmentEditing.addition.onEdit}>{ADD_SEGMENT_LABEL}</Button>
                      : null}
                    {page.conversation === null || page.composer === null
                      ? null
                      : (
                          <ConversationBand
                            anchorId={page.conversation.anchorId}
                            heading={page.conversation.heading}
                            emptyMessage={page.conversation.emptyMessage}
                            entries={page.conversation.entries}
                            placeholder={page.composer.placeholder}
                            submitLabel={page.composer.commentLabel}
                            isSubmitting={discussion.isCommentPending}
                            renderEditor={renderCommentEditor}
                            onComment={discussion.onComment}
                          />
                        )}
                  </div>
                </div>
                {isArranging && isOwn
                  ? (
                      <ArrangeDialog
                        title={ARRANGE_SEGMENTS_TITLE}
                        description={ARRANGE_SEGMENTS_DESCRIPTION}
                        entries={page.segments.map((segment) => ({ id: segment.id, ...segment.outline }))}
                        isPending={segmentEditing.isPending}
                        onMove={segmentEditing.onMove}
                        onClose={() => { setIsArranging(false) }}
                      />
                    )
                  : null}
                {!isOwn || arrangedWalkthroughSegment === null
                  ? null
                  : (
                      <ArrangeDialog
                        title={ARRANGE_FILES_TITLE}
                        description={ARRANGE_FILES_DESCRIPTION}
                        entries={arrangedWalkthroughSegment.walkthrough.fileOrder.map((file) => ({ id: file.path, ...file }))}
                        isPending={walkthroughEditing.isPending}
                        onMove={(path, direction) => { walkthroughEditing.onMoveFile(arrangedWalkthroughSegment.id, path, direction) }}
                        onClose={() => { setArrangedWalkthroughSegmentId(null) }}
                      />
                    )}
                {!isOwn || journeyEditing.cardAddition === null
                  ? null
                  : <AddCardDialog reviewKey={reviewKey} addition={journeyEditing.cardAddition} />}
                {!isOwn || journeyEditing.cardChange === null
                  ? null
                  : (
                      <Suspense fallback={null}>
                        <ModifyCardDialog
                          reviewKey={reviewKey}
                          change={journeyEditing.cardChange}
                          renderCodeLinkDialog={(request) => <CodeLinkDialog reviewKey={reviewKey} {...request} />}
                        />
                      </Suspense>
                    )}
                {isChoosingPullRequest && page.completeAction?.pullRequestChoice != null
                  ? (
                      <CompletionDialog
                        choice={page.completeAction.pullRequestChoice}
                        isPending={markComplete.isPending}
                        onComplete={(pullRequestTargetId) => { markComplete.mutate({ ...reviewKey, pullRequestTargetId }) }}
                        onClose={() => { setIsChoosingPullRequest(false) }}
                      />
                    )
                  : null}
                {unassignedFilesPrompt === null || page.unassignedFiles === null
                  ? null
                  : (
                      <UnassignedFilesDialog
                        title={page.unassignedFiles.title}
                        description={page.unassignedFiles.description}
                        paths={page.unassignedFiles.paths}
                        confirmation={unassignedFilesPrompt.kind === "list"
                          ? null
                          : {
                              warning: page.unassignedFiles.publishWarning,
                              confirmLabel: PUBLISH_ANYWAY_LABEL,
                              onConfirm: () => {
                                publishArtifact.mutate({ ...reviewKey, destination: unassignedFilesPrompt.destination })
                                setUnassignedFilesPrompt(null)
                              },
                            }}
                        onClose={() => { setUnassignedFilesPrompt(null) }}
                      />
                    )}
                <SelectionReference
                  selection={codeSelection}
                  onComment={(path, range) => {
                    discussion.onStartRangeComment(path, range)
                    window.getSelection()?.removeAllRanges()
                  }}
                  onAsk={(selection) => {
                    withCodeReference(selection, ({ reference }) => {
                      chat.onAsk(reference)
                    })
                  }}
                />
                {chat.isOpen && chat.conversation !== undefined
                  ? (
                      <ChatPanel
                        conversation={chat.conversation}
                        modelChoice={chat.modelChoice}
                        codeLinks={page.codeLinks}
                        reference={chat.reference}
                        isSending={chat.isSending}
                        sendProblem={chat.sendProblem}
                        answering={chat.answering}
                        onSend={chat.onSend}
                        onAnswer={chat.onAnswer}
                        onChooseModel={chat.onChooseModel}
                        onClearReference={chat.onClearReference}
                        onOpenCodeLink={handleOpenCodeLink}
                        onClose={chat.onClose}
                      />
                    )
                  : null}
                <ReviewNavigatorBar />
              </WritingContext>
            </ReviewNavigator>
          )}
      {permission === null
        ? null
        : (
            <PermissionDialog
              key={permission.batchId}
              request={permission}
              isAnswering={chat.answering.pendingBatchId === permission.batchId}
              problem={chat.answering.rejection?.batchId === permission.batchId ? chat.answering.rejection.message : null}
              onAnswer={(pickedLabel, reason) => {
                chat.onAnswer(permission.batchId, [{ questionId: permission.questionId, pickedLabels: [pickedLabel], text: reason }])
              }}
            />
          )}
      <Toast message={toastMessage} />
    </div>
  )
}

export const ReviewError = ({ error }: ErrorComponentProps) => (
  <ServerError heading="MAYDAY! MAYDAY! We couldn't open this review" error={error} className="px-6 pt-8">
    <Link to="/" className="underline">Go to your repositories</Link>
  </ServerError>
)

const booleanOf = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined)

const stringListOf = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : undefined

export const validateReviewSearch = (search: Record<string, unknown>): ReviewSearch => ({
  filter: stringListOf(search.filter),
  reviewed: booleanOf(search.reviewed),
})
