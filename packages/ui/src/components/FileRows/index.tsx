import { ChevronDownIcon } from "lucide-react"
import { useLayoutEffect, useRef, useState, type RefObject } from "react"
import { CollapsibleTrigger } from "@/components/blocks/collapsible"
import CodeBlock, { hasKnownReference, lineAddressOf, lineKeyOf, type LineAddress, type LineCollapse } from "@/components/CodeBlock"
import CommentThread, {
  CommentComposer,
  type CommentEditorRenderer,
  type ThreadComment,
  type ThreadResolution,
} from "@/components/CommentThread"
import { HoverProse } from "@/components/Prose"
import ReviewToggle from "@/components/ReviewToggle"
import ThreadMark, { type MarkedThread } from "@/components/ThreadMark"
import WaypointBox from "@/components/WaypointBox"
import WaypointMark, { WaypointLane, type MarkedWaypoint } from "@/components/WaypointMark"
import type { CodeDefinitions, CodeLine, CodeLinkTargets, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"
import { lineSequenceOf, placeWaypoints, stemsOf, type StemTone } from "./gutter"

export interface WalkthroughWaypoint extends MarkedWaypoint {
  readonly id: string
  readonly previousId: string | null
  readonly nextId: string | null
}

export type FileRow
  = | { readonly kind: "lines", readonly id: string, readonly lines: readonly CodeLine[], readonly collapses: readonly LineCollapse[] }
    | { readonly kind: "gap", readonly id: string, readonly label: string, readonly rootBlockId: string | null }
    | { readonly kind: "waypoint", readonly id: string, readonly waypoint: WalkthroughWaypoint, readonly rootBlockId: string | null }

export interface FileRootBlock {
  readonly id: string
  readonly isReviewed: boolean
  readonly reviewLabel: string
  readonly reviewName: string
  readonly expandLabel: string
  readonly collapseLabel: string
}

export interface FileThread extends MarkedThread {
  readonly id: string
  readonly side: LineAddress["side"]
  readonly lineLabel: string
  readonly startLineLabel: string
  readonly rangeLabel: string | null
  readonly statusLabel: string | null
  readonly resolution: ThreadResolution | null
  readonly startsOpen: boolean
  readonly canReply: boolean
  readonly comments: readonly ThreadComment[]
}

export interface ComposerLabels {
  readonly addLabel: string
  readonly placeholder: string
  readonly replyPlaceholder: string
  readonly submitLabel: string
  readonly postNowLabel: string
  readonly replyLabel: string
  readonly commentLabel: string
  readonly cancelLabel: string
  readonly rangeHint: string
}

export interface CommentRange {
  readonly side: LineAddress["side"]
  readonly startLineLabel: string
  readonly lineLabel: string
}

export interface PreviewVisit {
  readonly waypointId: string
  readonly count: number
}

export interface FileCommenting {
  readonly composer: ComposerLabels
  readonly composingRange: CommentRange | null
  readonly isCommentPending: boolean
  readonly renderCommentEditor: CommentEditorRenderer
  readonly onStartComment: (path: string, address: LineAddress | null, isExtending: boolean) => void
  readonly onAddComment: (path: string, range: CommentRange, body: string) => void
  readonly onPostComment: (path: string, range: CommentRange, body: string) => void
  readonly onReply: (threadId: string, body: string) => void
  readonly onResolveThread: (threadId: string, isResolved: boolean) => void
  readonly onDiscardComment: (commentId: string) => void
}

interface FileRowsProps {
  readonly path: string
  readonly label: string
  readonly rows: readonly FileRow[]
  readonly rootBlocks: readonly FileRootBlock[]
  readonly threads: readonly FileThread[]
  readonly previewVisit?: PreviewVisit | null
  readonly openWaypointIds: ReadonlySet<string>
  readonly currentWaypointId: string | null
  readonly focusedWaypointId: string | null
  readonly isCollapsed?: boolean
  readonly isWrapped?: boolean
  readonly isReviewPending: boolean
  readonly commenting: FileCommenting | null
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
  readonly onRootBlockReviewedChange: ((rootBlockId: string, isReviewed: boolean) => void) | null
}

const DECIMAL = 10

const NO_ROW_IDS: ReadonlySet<string> = new Set()
const NO_IDS: ReadonlySet<string> = new Set()
const NO_LINES: ReadonlySet<CodeLine> = new Set()
const WAYPOINT_MARK_SELECTOR = "[data-waypoint-mark]"
const SCROLLING_OVERFLOWS: ReadonlySet<string> = new Set(["auto", "scroll"])
const UNFOCUSED_ROW_CLASSES = "transition-opacity duration-[180ms] ease-out data-[unfocused=true]:opacity-45"

const focusedRowIdsOf = (rows: readonly FileRow[], waypointId: string | null): ReadonlySet<string> => {
  const start = rows.findIndex((row) => row.kind === "waypoint" && row.waypoint.id === waypointId)
  if (start === -1) return NO_ROW_IDS
  const following = rows.slice(start + 1)
  const end = following.findIndex((row) => row.kind !== "lines")
  return new Set((end === -1 ? following : following.slice(0, end)).map((row) => row.id))
}

const referenceTabStopRowIdOf = (rows: readonly FileRow[], definitions: CodeDefinitions): string | null =>
  rows.find((row) => row.kind === "lines" && hasKnownReference(row.lines, definitions))?.id ?? null

const lineKeysOf = (range: CommentRange): string[] => {
  const start = Number.parseInt(range.startLineLabel, DECIMAL)
  const end = Number.parseInt(range.lineLabel, DECIMAL)
  return Array.from({ length: Math.max(end - start, 0) + 1 }, (_unused, offset) =>
    lineKeyOf({ side: range.side, lineLabel: String(start + offset) }))
}

const isAt = (range: CommentRange, address: LineAddress): boolean =>
  range.side === address.side && range.lineLabel === address.lineLabel

const rangeNameOf = (range: CommentRange): string =>
  range.startLineLabel === range.lineLabel ? range.lineLabel : `${range.startLineLabel} to ${range.lineLabel}`

const isSameAddress = (first: LineAddress | null, second: LineAddress | null): boolean =>
  first !== null && second !== null && first.side === second.side && first.lineLabel === second.lineLabel

const withToggled = (ids: ReadonlySet<string>, toggledIds: readonly string[]): ReadonlySet<string> =>
  new Set([...[...ids].filter((id) => !toggledIds.includes(id)), ...toggledIds.filter((id) => !ids.has(id))])

const isThreadOpen = (thread: FileThread, toggledThreadIds: ReadonlySet<string>): boolean =>
  thread.startsOpen !== toggledThreadIds.has(thread.id)

interface RootBlockOpening {
  readonly reviewedIds: ReadonlySet<string>
  readonly toggledIds: ReadonlySet<string>
}

const reviewedRootBlockIdsOf = (rootBlocks: readonly FileRootBlock[]): ReadonlySet<string> =>
  new Set(rootBlocks.filter((rootBlock) => rootBlock.isReviewed).map((rootBlock) => rootBlock.id))

const isRootBlockOpen = (rootBlock: FileRootBlock, toggledIds: ReadonlySet<string>): boolean =>
  rootBlock.isReviewed === toggledIds.has(rootBlock.id)

const withRootBlockOpen = (toggledIds: ReadonlySet<string>, rootBlock: FileRootBlock, isOpen: boolean): ReadonlySet<string> => {
  const otherIds = [...toggledIds].filter((toggledId) => toggledId !== rootBlock.id)
  return new Set(isOpen === rootBlock.isReviewed ? [...otherIds, rootBlock.id] : otherIds)
}

const openRootBlockIdsOf = (rootBlocks: readonly FileRootBlock[], toggledIds: ReadonlySet<string>): ReadonlySet<string> =>
  new Set(rootBlocks.filter((rootBlock) => isRootBlockOpen(rootBlock, toggledIds)).map((rootBlock) => rootBlock.id))

const changedIdsOf = (before: ReadonlySet<string>, after: ReadonlySet<string>): string[] =>
  [...[...before].filter((id) => !after.has(id)), ...[...after].filter((id) => !before.has(id))]

const useRootBlockOpening = (rootBlocks: readonly FileRootBlock[]) => {
  const reviewedIds = reviewedRootBlockIdsOf(rootBlocks)
  const [opening, setOpening] = useState<RootBlockOpening>({ reviewedIds, toggledIds: NO_IDS })
  const changedIds = changedIdsOf(opening.reviewedIds, reviewedIds)
  if (changedIds.length > 0) {
    setOpening({ reviewedIds, toggledIds: new Set([...opening.toggledIds].filter((id) => !changedIds.includes(id))) })
  }
  return {
    openRootBlockIds: openRootBlockIdsOf(rootBlocks, opening.toggledIds),
    onRootBlockOpenChange: (rootBlockId: string, isOpen: boolean): void => {
      const rootBlock = rootBlocks.find((candidate) => candidate.id === rootBlockId)
      if (rootBlock === undefined) return
      setOpening((current) => ({ ...current, toggledIds: withRootBlockOpen(current.toggledIds, rootBlock, isOpen) }))
    },
  }
}

const isInClosedRootBlock = (rootBlockId: string | null, openRootBlockIds: ReadonlySet<string>): boolean =>
  rootBlockId !== null && !openRootBlockIds.has(rootBlockId)

const markTopOf = (scope: HTMLElement | null, waypointId: string): number | null =>
  [...(scope?.querySelectorAll<HTMLElement>(WAYPOINT_MARK_SELECTOR) ?? [])]
    .find((mark) => mark.dataset.waypointMark === waypointId)
    ?.getBoundingClientRect().top ?? null

const isScroller = (element: HTMLElement): boolean =>
  SCROLLING_OVERFLOWS.has(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight

const scrollerOf = (element: HTMLElement | null): HTMLElement | Window => {
  const parent = element?.parentElement ?? null
  if (parent === null) return window
  return isScroller(parent) ? parent : scrollerOf(parent)
}

interface HeldMark {
  readonly waypointId: string
  readonly top: number
}

const useHeldMark = (scope: RefObject<HTMLElement | null>, openWaypointIds: ReadonlySet<string>) => {
  const heldMarkRef = useRef<HeldMark | null>(null)
  useLayoutEffect(() => {
    const held = heldMarkRef.current
    heldMarkRef.current = null
    const top = held === null ? null : markTopOf(scope.current, held.waypointId)
    if (held !== null && top !== null) scrollerOf(scope.current).scrollBy(0, top - held.top)
  }, [scope, openWaypointIds])
  return (waypointId: string): void => {
    const top = markTopOf(scope.current, waypointId)
    heldMarkRef.current = top === null ? null : { waypointId, top }
  }
}

const FileRows = ({
  path,
  label,
  rows,
  rootBlocks,
  threads,
  previewVisit = null,
  openWaypointIds,
  currentWaypointId,
  focusedWaypointId,
  isCollapsed = false,
  isWrapped = false,
  isReviewPending,
  commenting,
  codeLinks,
  codeDefinitions,
  onOpenCodeLink,
  onToggleWaypoint,
  onWaypointReviewedChange,
  onRootBlockReviewedChange,
}: FileRowsProps) => {
  const rowsRef = useRef<HTMLDivElement>(null)
  const [previewedWaypointId, setPreviewedWaypointId] = useState<string | null>(null)
  const [toggledThreadIds, setToggledThreadIds] = useState<ReadonlySet<string>>(NO_IDS)
  const { openRootBlockIds, onRootBlockOpenChange } = useRootBlockOpening(rootBlocks)
  const holdMark = useHeldMark(rowsRef, openWaypointIds)
  if (isCollapsed) return null
  const placedWaypoints = placeWaypoints(rows)
  const linesOfWaypoint = (waypointId: string | null): ReadonlySet<CodeLine> => (waypointId === null
    ? NO_LINES
    : new Set(stemsOf(rows, placedWaypoints, (stemmedId) => (stemmedId === waypointId ? "faint" : null)).keys()))
  const focusedLines = linesOfWaypoint(focusedWaypointId)
  const focusedRowIds = focusedLines.size === 0
    ? focusedRowIdsOf(rows, focusedWaypointId)
    : new Set(rows.filter((row) => row.kind === "lines" && row.lines.some((line) => focusedLines.has(line))).map((row) => row.id))
  const tabStopRowId = referenceTabStopRowIdOf(rows, codeDefinitions)
  const hasFocus = focusedRowIds.size > 0
  const composingRange = commenting?.composingRange ?? null
  const commentedLineKeys = new Set([...threads, ...(composingRange === null ? [] : [composingRange])].flatMap(lineKeysOf))
  const placedWaypointIds = new Set([...placedWaypoints.values()].flat().map((waypoint) => waypoint.id))
  const toneOf = (waypointId: string): StemTone | null => {
    if (openWaypointIds.has(waypointId)) return "solid"
    return waypointId === currentWaypointId ? "faint" : null
  }
  const stems = stemsOf(rows, placedWaypoints, toneOf)
  const markedLines = linesOfWaypoint(previewedWaypointId)
  const threadsAt = (address: LineAddress): FileThread[] => threads.filter((thread) => isAt(thread, address))
  const tabStopLine = lineSequenceOf(rows).find((line) => {
    if (line === null) return false
    const address = lineAddressOf(line)
    return placedWaypoints.has(line) || (address !== null && threadsAt(address).length > 0)
  }) ?? null
  const tabStopAddress = tabStopLine === null ? null : lineAddressOf(tabStopLine)
  const renderDefinitionDescription = (description: ProseBlocks) => (
    <HoverProse blocks={description} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  )
  const renderWaypointLane = (line: CodeLine) => (
    <WaypointLane stem={stems.get(line) ?? null}>
      {(placedWaypoints.get(line) ?? []).map((waypoint, index) => (
        <WaypointMark
          key={waypoint.id}
          waypoint={waypoint}
          isOpen={openWaypointIds.has(waypoint.id)}
          isCurrent={waypoint.id === currentWaypointId}
          isReviewPending={isReviewPending}
          isTabStop={line === tabStopLine && index === 0}
          previewRequest={previewVisit?.waypointId === waypoint.id ? previewVisit.count : null}
          codeLinks={codeLinks}
          onOpenCodeLink={onOpenCodeLink}
          onToggle={() => {
            holdMark(waypoint.id)
            onToggleWaypoint(waypoint.id)
          }}
          onReviewedChange={onWaypointReviewedChange === null
            ? null
            : (isReviewed) => { onWaypointReviewedChange(waypoint.id, isReviewed) }}
          onPreviewChange={(isPreviewed) => {
            setPreviewedWaypointId((previewedId) => {
              if (isPreviewed) return waypoint.id
              return previewedId === waypoint.id ? null : previewedId
            })
          }}
        />
      ))}
    </WaypointLane>
  )
  const renderThreadMark = (address: LineAddress) => {
    const markedThreads = commenting === null ? [] : threadsAt(address)
    if (markedThreads.length === 0) return null
    return (
      <ThreadMark
        threads={markedThreads}
        isOpen={markedThreads.some((thread) => isThreadOpen(thread, toggledThreadIds))}
        isTabStop={isSameAddress(address, tabStopAddress) && tabStopLine !== null && !placedWaypoints.has(tabStopLine)}
        onToggle={() => {
          setToggledThreadIds((toggledIds) => withToggled(toggledIds, markedThreads.map((thread) => thread.id)))
        }}
      />
    )
  }
  const renderCollapseControls = (rootBlockId: string) => {
    const rootBlock = rootBlocks.find((candidate) => candidate.id === rootBlockId)
    if (rootBlock === undefined) return null
    const isOpen = openRootBlockIds.has(rootBlockId)
    return (
      <>
        {onRootBlockReviewedChange === null
          ? null
          : (
              <ReviewToggle
                label={rootBlock.reviewLabel}
                accessibleLabel={rootBlock.reviewName}
                isReviewed={rootBlock.isReviewed}
                isDisabled={isReviewPending}
                className="h-6"
                onChange={(isReviewed) => { onRootBlockReviewedChange(rootBlockId, isReviewed) }}
              />
            )}
        <CollapsibleTrigger
          aria-label={isOpen ? rootBlock.collapseLabel : rootBlock.expandLabel}
          className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-4 transition-transform duration-[180ms] ease-out", isOpen ? "" : "-rotate-90")}
          />
        </CollapsibleTrigger>
      </>
    )
  }
  const renderLineThreads = (address: LineAddress) => (commenting === null
    ? null
    : (
        <>
          {threadsAt(address).filter((thread) => isThreadOpen(thread, toggledThreadIds)).map((thread) => (
            <CommentThread
              key={thread.id}
              comments={thread.comments}
              label={`${path} ${rangeNameOf(thread)}`}
              rangeLabel={thread.rangeLabel}
              statusLabel={thread.statusLabel}
              resolution={thread.resolution}
              canReply={thread.canReply}
              replyPlaceholder={commenting.composer.replyPlaceholder}
              submitLabel={commenting.composer.replyLabel}
              cancelLabel={commenting.composer.cancelLabel}
              isSubmitting={commenting.isCommentPending}
              renderEditor={commenting.renderCommentEditor}
              onReply={(body) => {
                commenting.onReply(thread.id, body)
              }}
              onResolve={(isResolved) => {
                commenting.onResolveThread(thread.id, isResolved)
              }}
              onDiscard={commenting.onDiscardComment}
            />
          ))}
          {composingRange !== null && isAt(composingRange, address)
            ? (
                <CommentComposer
                  label={`${commenting.composer.placeholder}, ${path} ${rangeNameOf(composingRange)}`}
                  submitLabel={commenting.composer.submitLabel}
                  postNowLabel={commenting.composer.postNowLabel}
                  cancelLabel={commenting.composer.cancelLabel}
                  hint={commenting.composer.rangeHint}
                  isSubmitting={commenting.isCommentPending}
                  shouldFocus
                  className="my-1.5 mr-4 ml-28 max-w-[52rem] rounded-md border border-input bg-card p-3 font-sans whitespace-normal"
                  renderEditor={commenting.renderCommentEditor}
                  onSubmit={(body) => {
                    commenting.onAddComment(path, composingRange, body)
                  }}
                  onPostNow={(body) => {
                    commenting.onPostComment(path, composingRange, body)
                  }}
                  onCancel={() => {
                    commenting.onStartComment(path, null, false)
                  }}
                />
              )
            : null}
        </>
      ))
  return (
    <div ref={rowsRef}>
      {rows.map((row) => {
        if (row.kind === "lines") {
          const isInFocus = focusedRowIds.has(row.id)
          return (
            <div
              key={row.id}
              data-unfocused={hasFocus && !isInFocus}
              data-waypoint-focus={isInFocus ? focusedWaypointId ?? undefined : undefined}
              className={UNFOCUSED_ROW_CLASSES}
            >
              <CodeBlock
                lines={row.lines}
                definitions={codeDefinitions}
                hasReferenceTabStop={row.id === tabStopRowId}
                renderDefinitionDescription={renderDefinitionDescription}
                path={path}
                label={label}
                isWrapped={isWrapped}
                className="py-0"
                collapses={row.collapses}
                openRootBlockIds={openRootBlockIds}
                renderCollapseControls={renderCollapseControls}
                onRootBlockOpenChange={onRootBlockOpenChange}
                commentedLineKeys={commentedLineKeys}
                markedLines={markedLines}
                renderLineThreads={renderLineThreads}
                renderWaypointLane={renderWaypointLane}
                renderThreadMark={renderThreadMark}
                {...(commenting === null
                  ? {}
                  : {
                      addCommentLabel: commenting.composer.addLabel,
                      onAddComment: (address: LineAddress, isExtending: boolean) => {
                        commenting.onStartComment(path, address, isExtending)
                      },
                    })}
              />
            </div>
          )
        }
        if (isInClosedRootBlock(row.rootBlockId, openRootBlockIds)) return null
        if (row.kind === "gap") {
          return (
            <p key={row.id} className="border-y bg-muted/60 py-0.5 pl-28 font-mono text-xs text-muted-foreground first-of-type:border-t-0 last:border-b-0">
              {row.label}
            </p>
          )
        }
        const isPlaced = placedWaypointIds.has(row.waypoint.id)
        const isOpen = openWaypointIds.has(row.waypoint.id)
        if (isPlaced && !isOpen) return null
        return (
          <div
            key={row.id}
            data-waypoint-focus={row.waypoint.id === focusedWaypointId ? focusedWaypointId : undefined}
            className="relative bg-code"
          >
            {isPlaced
              ? <span aria-hidden="true" className="pointer-events-none absolute top-5 bottom-0 left-[calc(0.625rem-1px)] w-0.5 bg-(--line)" />
              : null}
            <WaypointBox
              waypoint={row.waypoint}
              isOpen={isOpen}
              isCurrent={row.waypoint.id === currentWaypointId}
              isReviewPending={isReviewPending}
              isGuttered
              codeLinks={codeLinks}
              onOpenCodeLink={onOpenCodeLink}
              onToggle={() => { onToggleWaypoint(row.waypoint.id) }}
              onReviewedChange={onWaypointReviewedChange === null
                ? null
                : (isReviewed) => { onWaypointReviewedChange(row.waypoint.id, isReviewed) }}
            />
          </div>
        )
      })}
    </div>
  )
}

export default FileRows
