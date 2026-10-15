import { ChevronRightIcon } from "lucide-react"
import { useState } from "react"
import CodeBlock, { lineKeyOf, type LineAddress } from "@/components/CodeBlock"
import CommentThread, {
  CommentComposer,
  type CommentEditorRenderer,
  type ThreadComment,
  type ThreadResolution,
} from "@/components/CommentThread"
import OutwardLink from "@/components/OutwardLink"
import { HoverProse } from "@/components/Prose"
import ReviewToggle from "@/components/ReviewToggle"
import WaypointBox, { type WaypointContent } from "@/components/WaypointBox"
import type { CodeDefinitions, CodeLine, CodeLinkTargets, ForgeLink, ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export interface WalkthroughWaypoint extends WaypointContent {
  readonly id: string
  readonly previousId: string | null
  readonly nextId: string | null
}

export type FileRow
  = | { readonly kind: "lines", readonly id: string, readonly lines: readonly CodeLine[] }
    | { readonly kind: "gap", readonly id: string, readonly label: string }
    | { readonly kind: "waypoint", readonly id: string, readonly waypoint: WalkthroughWaypoint }

export interface FileThread {
  readonly id: string
  readonly side: LineAddress["side"]
  readonly lineLabel: string
  readonly startLineLabel: string
  readonly rangeLabel: string | null
  readonly statusLabel: string | null
  readonly resolution: ThreadResolution | null
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

export interface WalkthroughFile {
  readonly anchorId: string
  readonly path: string
  readonly title: string
  readonly isReviewed: boolean
  readonly reviewLabel: string
  readonly forgeLink: ForgeLink | null
  readonly rows: readonly FileRow[]
  readonly threads: readonly FileThread[]
}

interface FileSectionProps {
  readonly file: WalkthroughFile
  readonly openWaypointIds: ReadonlySet<string>
  readonly currentWaypointId: string | null
  readonly isReviewPending: boolean
  readonly composer: ComposerLabels | null
  readonly composingRange: CommentRange | null
  readonly isCommentPending: boolean
  readonly renderCommentEditor: CommentEditorRenderer
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
  readonly onFileReviewedChange: ((path: string, isReviewed: boolean) => void) | null
  readonly onStartComment: (path: string, address: LineAddress | null, isExtending: boolean) => void
  readonly onAddComment: (path: string, range: CommentRange, body: string) => void
  readonly onPostComment: (path: string, range: CommentRange, body: string) => void
  readonly onReply: (threadId: string, body: string) => void
  readonly onResolveThread: (threadId: string, isResolved: boolean) => void
  readonly onDiscardComment: (commentId: string) => void
}

const DECIMAL = 10
const COLLAPSE_LABEL = "Collapse file"
const EXPAND_LABEL = "Expand file"

interface Collapse {
  readonly isCollapsed: boolean
  readonly currentWaypointId: string | null
}

const holdsWaypoint = (file: WalkthroughFile, waypointId: string | null): boolean =>
  file.rows.some((row) => row.kind === "waypoint" && row.waypoint.id === waypointId)

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

const FileSection = ({
  file,
  openWaypointIds,
  currentWaypointId,
  isReviewPending,
  composer,
  composingRange,
  isCommentPending,
  renderCommentEditor,
  codeLinks,
  codeDefinitions,
  onOpenCodeLink,
  onToggleWaypoint,
  onWaypointReviewedChange,
  onFileReviewedChange,
  onStartComment,
  onAddComment,
  onPostComment,
  onReply,
  onResolveThread,
  onDiscardComment,
}: FileSectionProps) => {
  const [collapse, setCollapse] = useState<Collapse>({ isCollapsed: false, currentWaypointId })
  if (collapse.currentWaypointId !== currentWaypointId) {
    setCollapse({ isCollapsed: collapse.isCollapsed && !holdsWaypoint(file, currentWaypointId), currentWaypointId })
  }
  const { isCollapsed } = collapse
  const commentedLineKeys = new Set([...file.threads, ...(composingRange === null ? [] : [composingRange])].flatMap(lineKeysOf))
  const renderDefinitionDescription = (description: ProseBlocks) => (
    <HoverProse blocks={description} codeLinks={codeLinks} onOpenCodeLink={onOpenCodeLink} />
  )
  const renderLineThreads = (address: LineAddress) => (composer === null
    ? null
    : (
        <>
          {file.threads.filter((thread) => isAt(thread, address)).map((thread) => (
            <CommentThread
              key={thread.id}
              comments={thread.comments}
              label={`${file.path} ${rangeNameOf(thread)}`}
              rangeLabel={thread.rangeLabel}
              statusLabel={thread.statusLabel}
              resolution={thread.resolution}
              canReply={thread.canReply}
              replyPlaceholder={composer.replyPlaceholder}
              submitLabel={composer.replyLabel}
              cancelLabel={composer.cancelLabel}
              isSubmitting={isCommentPending}
              renderEditor={renderCommentEditor}
              onReply={(body) => {
                onReply(thread.id, body)
              }}
              onResolve={(isResolved) => {
                onResolveThread(thread.id, isResolved)
              }}
              onDiscard={onDiscardComment}
            />
          ))}
          {composingRange !== null && isAt(composingRange, address)
            ? (
                <CommentComposer
                  label={`${composer.placeholder}, ${file.path} ${rangeNameOf(composingRange)}`}
                  submitLabel={composer.submitLabel}
                  postNowLabel={composer.postNowLabel}
                  cancelLabel={composer.cancelLabel}
                  hint={composer.rangeHint}
                  isSubmitting={isCommentPending}
                  shouldFocus
                  className="my-1.5 mr-4 ml-18 max-w-[52rem] rounded-md border border-input bg-card p-3 font-sans whitespace-normal"
                  renderEditor={renderCommentEditor}
                  onSubmit={(body) => {
                    onAddComment(file.path, composingRange, body)
                  }}
                  onPostNow={(body) => {
                    onPostComment(file.path, composingRange, body)
                  }}
                  onCancel={() => {
                    onStartComment(file.path, null, false)
                  }}
                />
              )
            : null}
        </>
      ))
  return (
    <article
      id={file.anchorId}
      aria-label={file.title}
      data-reviewed={file.isReviewed}
      className="scroll-mt-(--waypoint-scroll-margin) pt-6 [contain-intrinsic-size:auto_32rem] [content-visibility:auto]"
    >
      <div className="overflow-clip rounded-md border">
        <div className={cn("sticky top-(--file-header-top) z-10 flex h-11 items-center gap-3 bg-muted pr-1 pl-1.5", isCollapsed ? "" : "border-b")}>
          <button
            type="button"
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? EXPAND_LABEL : COLLAPSE_LABEL}: ${file.path}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => { setCollapse({ isCollapsed: !isCollapsed, currentWaypointId }) }}
          >
            <ChevronRightIcon
              aria-hidden="true"
              className={cn("size-4 transition-transform duration-[180ms] ease-out", isCollapsed ? "" : "rotate-90")}
            />
          </button>
          <div className="flex min-w-0 flex-col justify-center">
            <h3 className="truncate text-[0.9375rem] leading-5 font-semibold">{file.title}</h3>
            <p className="truncate font-mono text-xs leading-4 text-muted-foreground" title={file.path}>{file.path}</p>
          </div>
          <span className="flex-1" />
          {file.forgeLink === null ? null : <OutwardLink href={file.forgeLink.href} label={file.forgeLink.label} className="shrink-0 text-xs" />}
          {onFileReviewedChange === null
            ? null
            : (
                <ReviewToggle
                  label={file.reviewLabel}
                  isReviewed={file.isReviewed}
                  isDisabled={isReviewPending}
                  onChange={(isReviewed) => { onFileReviewedChange(file.path, isReviewed) }}
                />
              )}
        </div>
        {isCollapsed
          ? null
          : file.rows.map((row) => {
              if (row.kind === "lines") {
                return (
                  <CodeBlock
                    key={row.id}
                    lines={row.lines}
                    definitions={codeDefinitions}
                    renderDefinitionDescription={renderDefinitionDescription}
                    path={file.path}
                    label={file.path}
                    className="py-0"
                    commentedLineKeys={commentedLineKeys}
                    renderLineThreads={renderLineThreads}
                    {...(composer === null
                      ? {}
                      : {
                          addCommentLabel: composer.addLabel,
                          onAddComment: (address: LineAddress, isExtending: boolean) => {
                            onStartComment(file.path, address, isExtending)
                          },
                        })}
                  />
                )
              }
              if (row.kind === "gap") {
                return (
                  <p key={row.id} className="border-y bg-muted/60 py-0.5 pl-18 font-mono text-xs text-muted-foreground first-of-type:border-t-0 last:border-b-0">
                    {row.label}
                  </p>
                )
              }
              return (
                <div key={row.id} className="bg-code">
                  <WaypointBox
                    waypoint={row.waypoint}
                    isOpen={openWaypointIds.has(row.waypoint.id)}
                    isCurrent={row.waypoint.id === currentWaypointId}
                    isReviewPending={isReviewPending}
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
    </article>
  )
}

export default FileSection
