import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router"
import { use, useState } from "react"
import { createPortal } from "react-dom"
import { BandSlotContext } from "@/band-slot"
import { useTRPC } from "@/trpc"
import BandLine from "@flightplan/ui/BandLine"
import Button from "@flightplan/ui/blocks/button"
import ChatPanel from "@flightplan/ui/ChatPanel"
import IconButton from "@flightplan/ui/IconButton"
import { LINE_COLOR_CLASSES } from "@flightplan/ui/lib/line-color"
import { cn } from "@flightplan/ui/lib/utils"
import SubmitReviewMenu, { BandButton, OptionsMenu, ShareMenu } from "@flightplan/ui/ReviewActions"
import ReviewHeader from "@flightplan/ui/ReviewHeader"
import SectionRail from "@flightplan/ui/SectionRail"
import Toast from "@flightplan/ui/Toast"
import BlastBand from "./-components/BlastBand"
import CodeWalkthrough from "./-components/CodeWalkthrough"
import ContextBand from "./-components/ContextBand"
import ConversationBand from "./-components/ConversationBand"
import FileSection from "./-components/FileSection"
import JourneyBand from "./-components/JourneyBand"
import ReviewNotices from "./-components/ReviewNotices"
import ReviewPageSkeleton from "./-components/ReviewPageSkeleton"
import SelectionReference, { type CodeSelection } from "./-components/SelectionReference"
import StartReview from "./-components/StartReview"
import { useCodeSelection } from "./-hooks/use-code-selection"
import { useCurrentAnchor } from "./-hooks/use-current-anchor"
import { useScrolledPast } from "./-hooks/use-scrolled-past"
import { useStepShortcuts } from "./-hooks/use-step-shortcuts"
import { useToast } from "./-hooks/use-toast"

const REFRESH_INTERVAL_MS = 5000
const CHAT_REFRESH_INTERVAL_MS = 1000
const BACK_TO_TOP_AFTER_PX = 480
const UNKNOWN_ERROR_MESSAGE = "The backend did not say what went wrong."
const COPY_FAILED_MESSAGE = "Could not copy to the clipboard"
const PAGE_HEADING_CLASSES = "text-4xl leading-10 font-bold tracking-[-0.02em]"
const LAYOUT_VARIABLES = "[--band-height:3.5rem] [--walkthrough-heading-height:2.75rem] [--section-scroll-margin:4.5rem] [--file-header-top:6.25rem] [--waypoint-scroll-margin:9.75rem] [--chat-width:26rem]"

export interface ReviewSearch {
  readonly filter?: string[] | undefined
  readonly reviewed?: boolean | undefined
  readonly levels?: number | undefined
  readonly data?: boolean | undefined
  readonly assumed?: boolean | undefined
  readonly rings?: number | undefined
  readonly blastData?: boolean | undefined
  readonly blastAssumed?: boolean | undefined
}

interface ReviewParams {
  readonly repoName: string
  readonly branchId: string
}

const reviewRequestOf = (params: ReviewParams, search: ReviewSearch) => ({
  repositoryName: params.repoName,
  targetId: params.branchId,
  filterKeys: search.filter ?? null,
  isShowingReviewed: search.reviewed ?? false,
  journey: {
    levels: search.levels ?? null,
    isShowingData: search.data ?? null,
    isShowingAssumed: search.assumed ?? null,
  },
  blast: {
    levels: search.rings ?? null,
    isShowingData: search.blastData ?? null,
    isShowingAssumed: search.blastAssumed ?? null,
  },
})

const scrollToAnchor = (anchorId: string): void => {
  document.getElementById(anchorId)?.scrollIntoView({ block: "start" })
}

const ReviewPage = () => {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const bandSlot = use(BandSlotContext)
  const reviewKey = { repositoryName: params.repoName, targetId: params.branchId }
  const { data: page } = useSuspenseQuery({
    ...trpc.review.get.queryOptions(reviewRequestOf(params, search)),
    refetchInterval: REFRESH_INTERVAL_MS,
  })
  const [openWaypointIds, setOpenWaypointIds] = useState<ReadonlySet<string>>(() => new Set())
  const [currentWaypointId, setCurrentWaypointId] = useState<string | null>(null)
  const [composingAt, setComposingAt] = useState<{ readonly path: string, readonly lineLabel: string } | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatReference, setChatReference] = useState<string | null>(null)
  const [toastMessage, showToast] = useToast()
  const codeSelection = useCodeSelection()
  const isScrolledDown = useScrolledPast(BACK_TO_TOP_AFTER_PX)
  const chat = useQuery({
    ...trpc.review.chat.queryOptions(reviewKey),
    enabled: isChatOpen,
    refetchInterval: CHAT_REFRESH_INTERVAL_MS,
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

  const changeSearch = (change: ReviewSearch): void => {
    void navigate({ search: (previous) => ({ ...previous, ...change }), replace: true, resetScroll: false })
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
        LINE_COLOR_CLASSES[page.shell.lineColor],
        LAYOUT_VARIABLES,
      )}
    >
      <title>{page.shell.documentTitle}</title>
      {bandSlot === null
        ? null
        : createPortal(
            <>
              <BandLine lineColor={page.shell.lineColor} />
              <ReviewHeader
                header={page.shell.header}
                changedFiles={page.kind === "missing" ? page.changedFiles : null}
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
                        <ShareMenu
                          sharing={page.sharing}
                          isPublishing={publishArtifact.isPending}
                          onPublish={(destination) => {
                            publishArtifact.mutate({ ...reviewKey, destination })
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
                        <OptionsMenu forgeLink={page.shell.header.kind === "pull-request" ? page.shell.header.forgeLink : null} />
                      </>
                    )}

              />
            </>,
            bandSlot,
          )}
      {page.kind === "missing"
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
                requestReview.mutate({ ...reviewKey, ...choice })
              }}
            />
          )
        : null}
      {page.kind === "missing"
        ? null
        : (
            <>
              <ReviewNotices
                staleNotice={page.staleNotice}
                draftingNotice={page.draftingNotice}
                onCopyPrompt={copyText}
              />
              <div className="grid grid-cols-[13rem_minmax(0,1fr)] gap-x-8">
                <aside className="sticky top-[calc(var(--band-height)+0.5rem)] max-h-[calc(100dvh-var(--band-height)-1rem)] self-start overflow-y-auto pt-5 pb-4">
                  <SectionRail
                    label="Review sections"
                    groups={page.rail.groups}
                    sections={page.rail.sections}
                    currentAnchorId={currentAnchorId}
                  />
                </aside>
                <div className="min-w-0">
                  {page.segments.map((segment) => (
                    <section
                      key={segment.id}
                      id={segment.anchorId}
                      aria-label={segment.heading ?? undefined}
                      className="scroll-mt-(--section-scroll-margin) not-first:border-t-4 not-first:border-foreground"
                    >
                      {segment.heading === null
                        ? null
                        : (
                            <div className="flex items-baseline gap-3 pt-6">
                              <h2 className="text-2xl leading-8 font-bold tracking-[-0.015em] text-(--line)">{segment.heading}</h2>
                              <p className="text-sm text-muted-foreground tabular-nums">{segment.detailLabel}</p>
                            </div>
                          )}
                      <ContextBand {...segment.context} codeLinks={page.codeLinks} onOpenCodeLink={handleOpenCodeLink} />
                      <JourneyBand
                        {...segment.journey}
                        codeLinks={page.codeLinks}
                        onOpenCodeLink={handleOpenCodeLink}
                        onLevelsChange={(levels) => {
                          changeSearch({ levels: levels ?? undefined })
                        }}
                        onToggle={(key, isOn) => {
                          changeSearch(key === "data" ? { data: isOn } : { assumed: isOn })
                        }}
                      />
                      {segment.blast === null
                        ? null
                        : (
                            <BlastBand
                              {...segment.blast}
                              codeLinks={page.codeLinks}
                              onOpenCodeLink={handleOpenCodeLink}
                              onLevelsChange={(rings) => {
                                changeSearch({ rings: rings ?? undefined })
                              }}
                              onToggle={(key, isOn) => {
                                changeSearch(key === "data" ? { blastData: isOn } : { blastAssumed: isOn })
                              }}
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
                        onShowReviewedChange={(isShown) => {
                          changeSearch({ reviewed: isShown ? true : undefined })
                        }}
                      >
                        {segment.walkthrough.files.map((file) => (
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
            </>
          )}
      <Toast message={toastMessage} />
    </div>
  )
}

const ReviewError = ({ error }: ErrorComponentProps) => {
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

const countOf = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined

const stringListOf = (value: unknown): string[] | undefined =>
  Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : undefined

export const Route = createFileRoute("/pr-reviews/$repoName/$branchId")({
  staticData: { isFullWidth: true },
  validateSearch: (search: Record<string, unknown>): ReviewSearch => ({
    filter: stringListOf(search.filter),
    reviewed: booleanOf(search.reviewed),
    levels: countOf(search.levels),
    data: booleanOf(search.data),
    assumed: booleanOf(search.assumed),
    rings: countOf(search.rings),
    blastData: booleanOf(search.blastData),
    blastAssumed: booleanOf(search.blastAssumed),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient, trpc }, params, deps }) => {
    await queryClient.query({ ...trpc.review.get.queryOptions(reviewRequestOf(params, deps)), staleTime: "static" })
  },
  component: ReviewPage,
  pendingComponent: ReviewPageSkeleton,
  errorComponent: ReviewError,
})
