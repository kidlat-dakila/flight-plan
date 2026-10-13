import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { lazy, Suspense, use, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { BandSlotContext } from "@/band-slot"
import { requestNotificationPermission } from "@/notification-permission"
import { useTRPC } from "@/trpc"
import BandLine from "@flightplan/ui/BandLine"
import BlastBand from "@flightplan/ui/BlastBand"
import Button from "@flightplan/ui/blocks/button"
import ChatPanel from "@flightplan/ui/ChatPanel"
import CodeWalkthrough from "@flightplan/ui/CodeWalkthrough"
import FileSection from "@flightplan/ui/FileSection"
import IconButton from "@flightplan/ui/IconButton"
import JourneyBand from "@flightplan/ui/JourneyBand"
import { useCurrentAnchor } from "@flightplan/ui/lib/use-current-anchor"
import { useStepShortcuts } from "@flightplan/ui/lib/use-step-shortcuts"
import { cn } from "@flightplan/ui/lib/utils"
import { WritingContext } from "@flightplan/ui/lib/writing-context"
import SubmitReviewMenu, { BandButton, BandHint, OptionsMenu, ShareMenu, type PublicationKind } from "@flightplan/ui/ReviewActions"
import ReviewHeader from "@flightplan/ui/ReviewHeader"
import SectionRail from "@flightplan/ui/SectionRail"
import Toast from "@flightplan/ui/Toast"
import AddCardDialog from "./-components/AddCardDialog"
import ArrangeDialog from "./-components/ArrangeDialog"
import CodeLinkDialog from "./-components/CodeLinkDialog"
import ContextBand from "./-components/ContextBand"
import ConversationBand from "./-components/ConversationBand"
import RebuildReviewDialog from "./-components/RebuildReviewDialog"
import ReviewNotices from "./-components/ReviewNotices"
import SegmentEditor from "./-components/SegmentEditor"
import SegmentHeader from "./-components/SegmentHeader"
import SelectionReference, { type CodeSelection } from "./-components/SelectionReference"
import StartReview from "./-components/StartReview"
import UnassignedFilesDialog from "./-components/UnassignedFilesDialog"
import WalkthroughFile from "./-components/WalkthroughFile"
import { useCodeSelection } from "./-hooks/use-code-selection"
import { useCompletionNotification } from "./-hooks/use-completion-notification"
import { useContextEditing } from "./-hooks/use-context-editing"
import { useJourneyEditing } from "./-hooks/use-journey-editing"
import { useScrolledPast } from "./-hooks/use-scrolled-past"
import { useSegmentEditing } from "./-hooks/use-segment-editing"
import { useToast } from "./-hooks/use-toast"
import { useWalkthroughEditing } from "./-hooks/use-walkthrough-editing"

const ModifyCardDialog = lazy(async () => await import("./-components/ModifyCardDialog"))
const BlastImpactEditor = lazy(async () => await import("./-components/BlastImpactEditor"))
const ContextEditor = lazy(async () => await import("./-components/ContextEditor"))

const REFRESH_INTERVAL_MS = 5000
const CHAT_REFRESH_INTERVAL_MS = 1000
const BACK_TO_TOP_AFTER_PX = 480
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
const PAGE_HEADING_CLASSES = "text-4xl leading-10 font-bold tracking-[-0.02em]"
const ACCENT_LINE_CLASS = "[--line:var(--primary-text)]"
const LAYOUT_VARIABLES = "[--band-height:3.5rem] [--walkthrough-heading-height:2.75rem] [--section-scroll-margin:4.5rem] [--file-header-top:6.25rem] [--waypoint-scroll-margin:9.75rem] [--chat-width:26rem]"

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

export interface Authoring {
  readonly label: string
  readonly startForm: ReactNode
}

interface ReviewPageProps {
  readonly params: ReviewParams
  readonly search: ReviewSearch
  readonly authoring: Authoring | null
  readonly onSearchChange: (change: ReviewSearch) => void
}

export const reviewRequestOf = (params: ReviewParams, search: ReviewSearch, isAuthoring = false) => ({
  repositoryName: params.repoName,
  targetId: params.branchId,
  filterKeys: search.filter ?? null,
  isShowingReviewed: isAuthoring || (search.reviewed ?? false),
  isAuthoring,
})

const scrollToAnchor = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" })
}

export const ReviewPage = ({ params, search, authoring, onSearchChange }: ReviewPageProps) => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const bandSlot = use(BandSlotContext)
  const reviewKey = { repositoryName: params.repoName, targetId: params.branchId }
  const { data: page } = useSuspenseQuery({
    ...trpc.review.get.queryOptions(reviewRequestOf(params, search, authoring !== null)),
    refetchInterval: REFRESH_INTERVAL_MS,
    refetchIntervalInBackground: true,
  })
  const [openWaypointIds, setOpenWaypointIds] = useState<ReadonlySet<string>>(() => new Set())
  const [currentWaypointId, setCurrentWaypointId] = useState<string | null>(null)
  const [composingAt, setComposingAt] = useState<{ readonly path: string, readonly lineLabel: string } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatReference, setChatReference] = useState<string | null>(null)
  const [rebuildMode, setRebuildMode] = useState<"update" | "regenerate" | null>(null)
  const [unassignedFilesPrompt, setUnassignedFilesPrompt] = useState<UnassignedFilesPrompt | null>(null)
  const [isArranging, setIsArranging] = useState(false)
  const [arrangedWalkthroughSegmentId, setArrangedWalkthroughSegmentId] = useState<string | null>(null)
  const [toastMessage, showToast] = useToast()
  const progress = page.kind === "artifact" ? page.progress : null
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
  const isScrolledDown = useScrolledPast(BACK_TO_TOP_AFTER_PX)
  const chat = useQuery({
    ...trpc.review.chat.queryOptions(reviewKey),
    enabled: isChatOpen,
    refetchInterval: CHAT_REFRESH_INTERVAL_MS,
  })

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
  const addComment = useMutation(
    trpc.review.addComment.mutationOptions({
      onSuccess: async () => {
        setComposingAt(null)
        await refreshReview()
      },
      onError: reportError,
    }),
  )
  const submitReview = useMutation(
    trpc.review.submit.mutationOptions({
      onSuccess: async ({ message }) => {
        showToast(message)
        await refreshReview()
      },
    }),
  )
  const publishArtifact = useMutation(
    trpc.review.publish.mutationOptions({
      onSuccess: async ({ message }) => {
        showToast(message)
        await refreshReview()
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
  const sendChatMessage = useMutation(
    trpc.review.sendChatMessage.mutationOptions({
      onSuccess: async () => {
        setChatReference(null)
        await queryClient.invalidateQueries(trpc.review.chat.pathFilter())
      },
      onError: reportError,
    }),
  )

  const artifact = page.kind === "artifact" ? page : null
  const arrangedWalkthroughSegment = artifact?.segments.find((segment) => segment.id === arrangedWalkthroughSegmentId) ?? null
  const waypoints = artifact?.segments.flatMap((segment) =>
    segment.walkthrough.files.flatMap((file) =>
      file.rows.flatMap((row) => (row.kind === "waypoint" ? [row.waypoint] : [])))) ?? []
  const currentWaypoint = waypoints.find((waypoint) => waypoint.id === currentWaypointId) ?? null
  const previousWaypointId = currentWaypoint === null
    ? artifact?.walkthroughControls.stepping.lastWaypointId ?? null
    : currentWaypoint.previousId
  const nextWaypointId = currentWaypoint === null
    ? artifact?.walkthroughControls.stepping.firstWaypointId ?? null
    : currentWaypoint.nextId
  const railSections = [...(artifact?.rail.groups.flatMap((group) => group.sections) ?? []), ...(artifact?.rail.sections ?? [])]
  const currentAnchorId = useCurrentAnchor(
    railSections.flatMap((section) => [section.anchorId, ...section.children.map((child) => child.anchorId)]),
  )

  const changeSearch = onSearchChange

  const handleEditRailGroup = (anchorId: string): void => {
    const segment = artifact?.segments.find((candidate) => candidate.anchorId === anchorId)
    if (segment === undefined) return
    segmentEditing.authoringOf(segment.id).writing.onEdit()
    scrollToAnchor(anchorId)
  }

  const visitWaypoint = (waypointId: string | null): void => {
    const waypoint = waypoints.find((candidate) => candidate.id === waypointId)
    if (waypoint === undefined) return
    setCurrentWaypointId(waypoint.id)
    setOpenWaypointIds((openIds) => new Set([...openIds, waypoint.id]))
    scrollToAnchor(waypoint.anchorId)
  }

  const handleOpenCodeLink = (anchorId: string): void => {
    const waypoint = waypoints.find((candidate) => candidate.anchorId === anchorId)
    if (waypoint === undefined) scrollToAnchor(anchorId)
    else visitWaypoint(waypoint.id)
  }

  const handleToggleWaypoint = (waypointId: string): void => {
    setCurrentWaypointId(waypointId)
    setOpenWaypointIds((openIds) =>
      new Set(openIds.has(waypointId) ? [...openIds].filter((openId) => openId !== waypointId) : [...openIds, waypointId]))
  }

  const withCodeReference = (
    selection: CodeSelection,
    onResolved: (reference: { readonly reference: string, readonly copiedMessage: string }) => void,
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

  useStepShortcuts(
    () => {
      visitWaypoint(previousWaypointId)
    },
    () => {
      visitWaypoint(nextWaypointId)
    },
  )

  return (
    <div
      className={cn(
        "px-6 pb-16 transition-[margin] duration-200 ease-out",
        isChatOpen ? "mr-(--chat-width)" : "",
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
                authorLabel={authoring?.label ?? null}
                actions={page.kind === "missing"
                  ? null
                  : (
                      <>
                        <BandButton
                          label={page.chatLabel}
                          isPressed={isChatOpen}
                          onClick={() => {
                            setIsChatOpen((isOpen) => !isOpen)
                          }}
                        />
                        {authoring === null || page.unassignedFiles === null
                          ? null
                          : <BandHint label={page.unassignedFiles.label} onClick={() => { setUnassignedFilesPrompt({ kind: "list" }) }} />}
                        {authoring === null
                          ? (
                              <>
                                <ShareMenu
                                  sharing={page.sharing}
                                  isPublishing={publishArtifact.isPending}
                                  onPublish={(destination) => {
                                    if (page.unassignedFiles === null) publishArtifact.mutate({ ...reviewKey, destination })
                                    else setUnassignedFilesPrompt({ kind: "publish", destination })
                                  }}
                                />
                                <SubmitReviewMenu
                                  draft={page.reviewDraft}
                                  isSubmitting={submitReview.isPending}
                                  errorMessage={submitReview.error?.message ?? null}
                                  onSubmit={(verdict, body) => {
                                    submitReview.mutate({ ...reviewKey, verdict, body })
                                  }}
                                />
                              </>
                            )
                          : null}
                        <OptionsMenu
                          forgeLink={page.shell.header.kind === "pull-request" ? page.shell.header.forgeLink : null}
                          rebuild={authoring === null
                            ? {
                                onUpdate: () => { openRebuildDialog("update") },
                                onRegenerate: () => { openRebuildDialog("regenerate") },
                              }
                            : null}
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
      {page.kind === "missing" && authoring !== null ? authoring.startForm : null}
      {page.kind === "missing" && authoring === null
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
            <WritingContext value={page.progress?.isWriting === true ? page.progress.label : null}>
              <ReviewNotices
                staleNotice={page.staleNotice}
                unassignedFiles={authoring === null ? page.unassignedFiles : null}
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
                    onEditGroup={authoring === null ? null : handleEditRailGroup}
                    onArrangeGroups={authoring !== null && page.segments.some((segment) => segment.outline.canMoveUp) ? () => { setIsArranging(true) } : null}
                  />
                </aside>
                <div className="min-w-0">
                  {page.segments.map((segment) => (
                    <section
                      key={segment.id}
                      id={segment.anchorId}
                      aria-label={(authoring === null ? segment.heading : segment.outline.heading) ?? undefined}
                      className="scroll-mt-(--section-scroll-margin) not-first:border-t-4 not-first:border-foreground"
                    >
                      <SegmentHeader
                        reviewKey={reviewKey}
                        heading={segment.heading}
                        isTitleDraft={segment.isTitleDraft}
                        detailLabel={segment.detailLabel}
                        outline={segment.outline}
                        authoring={authoring === null ? null : segmentEditing.authoringOf(segment.id)}
                      />
                      <ContextBand
                        {...segment.context}
                        codeLinks={page.codeLinks}
                        editing={authoring === null ? null : contextEditingOf(segment.id)}
                        renderCodeLinkDialog={(request) => <CodeLinkDialog reviewKey={reviewKey} {...request} />}
                        onOpenCodeLink={handleOpenCodeLink}
                      />
                      <JourneyBand
                        {...segment.journey}
                        codeLinks={page.codeLinks}
                        codeDefinitions={page.codeDefinitions}
                        isReviewPending={setReviewed.isPending}
                        authoring={authoring === null ? null : journeyEditing.authoringOf(segment.id)}
                        renderDescriptionEditor={authoring === null
                          ? null
                          : (request) => (
                              <Suspense fallback={<p className="text-sm text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
                                <ContextEditor {...request} renderCodeLinkDialog={(linkRequest) => <CodeLinkDialog reviewKey={reviewKey} {...linkRequest} />} />
                              </Suspense>
                            )}
                        onOpenCodeLink={handleOpenCodeLink}
                        onWaypointReviewedChange={authoring === null
                          ? (id, isReviewed) => {
                              setReviewed.mutate({ ...reviewKey, subject: { kind: "waypoint", id }, isReviewed })
                            }
                          : null}
                      />
                      {segment.blast === null
                        ? null
                        : (
                            <BlastBand
                              {...segment.blast}
                              codeLinks={page.codeLinks}
                              renderImpactEditor={authoring === null
                                ? null
                                : (request) => (
                                    <Suspense fallback={<p className="text-muted-foreground">{EDITOR_LOADING_LABEL}</p>}>
                                      <BlastImpactEditor
                                        key={request.path}
                                        {...request}
                                        reviewKey={reviewKey}
                                        renderCodeLinkDialog={(linkRequest) => <CodeLinkDialog reviewKey={reviewKey} {...linkRequest} />}
                                      />
                                    </Suspense>
                                  )}
                              onOpenCodeLink={handleOpenCodeLink}
                              onOpenFile={handleOpenCodeLink}
                            />
                          )}
                      <CodeWalkthrough
                        anchorId={segment.walkthrough.anchorId}
                        heading={segment.walkthrough.heading}
                        intro={segment.walkthrough.intro}
                        coverageLabel={segment.walkthrough.coverageLabel}
                        controls={page.walkthroughControls}
                        positionLabel={currentWaypoint?.positionLabel ?? page.walkthroughControls.stepping.idleLabel}
                        canStepBack={previousWaypointId !== null}
                        canStepForward={nextWaypointId !== null}
                        emptyMessage={segment.walkthrough.emptyMessage}
                        codeLinks={page.codeLinks}
                        onArrangeFiles={authoring !== null && segment.walkthrough.fileOrder.length > 1
                          ? () => { setArrangedWalkthroughSegmentId(segment.id) }
                          : null}
                        onOpenCodeLink={handleOpenCodeLink}
                        onPrevious={() => {
                          visitWaypoint(previousWaypointId)
                        }}
                        onNext={() => {
                          visitWaypoint(nextWaypointId)
                        }}
                        onFilterChange={(keys) => {
                          changeSearch({ filter: keys === null ? undefined : [...keys] })
                        }}
                        onShowReviewedChange={authoring === null
                          ? (isShown) => { changeSearch({ reviewed: isShown ? true : undefined }) }
                          : null}
                      >
                        {authoring === null
                          ? null
                          : segment.walkthrough.files.map((file) => (
                              <WalkthroughFile
                                key={file.anchorId}
                                reviewKey={reviewKey}
                                segmentId={segment.id}
                                file={file}
                                openWaypointIds={openWaypointIds}
                                currentWaypointId={currentWaypointId}
                                isPending={walkthroughEditing.isPending}
                                codeLinks={page.codeLinks}
                                renderCodeLinkDialog={(request) => <CodeLinkDialog reviewKey={reviewKey} {...request} />}
                                onOpenCodeLink={handleOpenCodeLink}
                                onToggleWaypoint={handleToggleWaypoint}
                                onRemove={() => { walkthroughEditing.onRemoveFile(segment.id, file.path) }}
                                onRemoveWaypoint={(waypointId) => { walkthroughEditing.onRemoveWaypoint(segment.id, waypointId) }}
                              />
                            ))}
                        {authoring !== null
                          ? null
                          : segment.walkthrough.files.map((file) => (
                              <FileSection
                                key={file.anchorId}
                                file={file}
                                openWaypointIds={openWaypointIds}
                                currentWaypointId={currentWaypointId}
                                isReviewPending={setReviewed.isPending}
                                composer={page.composer}
                                composingLineLabel={composingAt?.path === file.path ? composingAt.lineLabel : null}
                                isCommentPending={addComment.isPending}
                                codeLinks={page.codeLinks}
                                codeDefinitions={page.codeDefinitions}
                                onOpenCodeLink={handleOpenCodeLink}
                                onToggleWaypoint={handleToggleWaypoint}
                                onWaypointReviewedChange={(id, isReviewed) => {
                                  setReviewed.mutate({ ...reviewKey, subject: { kind: "waypoint", id }, isReviewed })
                                }}
                                onFileReviewedChange={(path, isReviewed) => {
                                  setReviewed.mutate({ ...reviewKey, subject: { kind: "file", path }, isReviewed })
                                }}
                                onStartComment={(path, lineLabel) => {
                                  setComposingAt(lineLabel === null ? null : { path, lineLabel })
                                }}
                                onAddComment={(path, lineLabel, body) => {
                                  addComment.mutate({ ...reviewKey, threadId: null, location: { path, line: Number(lineLabel) }, body })
                                }}
                                onReply={(threadId, body) => {
                                  addComment.mutate({ ...reviewKey, threadId, location: null, body })
                                }}
                              />
                            ))}
                      </CodeWalkthrough>
                    </section>
                  ))}
                  {authoring !== null && page.segments.length === 0 && !segmentEditing.addition.isWriting
                    ? <p className="pt-6 text-muted-foreground">{NO_SEGMENTS_MESSAGE}</p>
                    : null}
                  {authoring !== null && segmentEditing.addition.isWriting
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
                  {authoring !== null && !segmentEditing.addition.isWriting
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
                          submitLabel={page.composer.submitLabel}
                          isSubmitting={addComment.isPending}
                          onComment={(body) => {
                            addComment.mutate({ ...reviewKey, threadId: page.conversation?.threadId ?? null, location: null, body })
                          }}
                        />
                      )}
                </div>
              </div>
              {isArranging && authoring !== null
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
              {authoring === null || arrangedWalkthroughSegment === null
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
              {authoring === null || journeyEditing.cardAddition === null
                ? null
                : <AddCardDialog reviewKey={reviewKey} addition={journeyEditing.cardAddition} />}
              {authoring === null || journeyEditing.cardChange === null
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
                onCopy={(selection) => {
                  withCodeReference(selection, ({ reference, copiedMessage }) => {
                    copyText(reference, copiedMessage)
                  })
                }}
                onAsk={(selection) => {
                  withCodeReference(selection, ({ reference }) => {
                    setChatReference(reference)
                    setIsChatOpen(true)
                  })
                }}
              />
              {isChatOpen && chat.data !== undefined
                ? (
                    <ChatPanel
                      chat={chat.data}
                      reference={chatReference}
                      isSending={sendChatMessage.isPending}
                      onSend={(body) => {
                        sendChatMessage.mutate({ ...reviewKey, body, reference: chatReference })
                      }}
                      onClearReference={() => {
                        setChatReference(null)
                      }}
                      onClose={() => {
                        setIsChatOpen(false)
                      }}
                    />
                  )
                : null}
              {isScrolledDown && !isChatOpen
                ? (
                    <IconButton
                      icon="top"
                      label="Back to top"
                      variant="outline"
                      className="fixed right-4 bottom-4 z-30"
                      onClick={() => {
                        window.scrollTo({ top: 0 })
                      }}
                    />
                  )
                : null}
            </WritingContext>
          )}
      <Toast message={toastMessage} />
    </div>
  )
}

export const ReviewError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  return (
    <section role="alert" className="max-w-prose px-6 pt-8">
      <h1 className={PAGE_HEADING_CLASSES}>Could not open this review</h1>
      <p className="mt-2 text-muted-foreground">{error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}</p>
      <div className="mt-4 flex items-center gap-4">
        <Button onClick={() => { void router.invalidate() }}>Try again</Button>
        <Link to="/" className="underline">Go to your repositories</Link>
      </div>
    </section>
  )
}

const booleanOf = (value: unknown): boolean | undefined => (typeof value === "boolean" ? value : undefined)

const stringListOf = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : undefined

export const validateReviewSearch = (search: Record<string, unknown>): ReviewSearch => ({
  filter: stringListOf(search.filter),
  reviewed: booleanOf(search.reviewed),
})
