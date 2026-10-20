import { ChevronRightIcon } from "lucide-react"
import type { LineAddress } from "@/components/CodeBlock"
import type { CommentEditorRenderer } from "@/components/CommentThread"
import FileRows, {
  type CommentRange,
  type ComposerLabels,
  type FileCommenting,
  type FileRootBlock,
  type FileRow,
  type FileThread,
  type PreviewVisit,
  type WriteUpTarget,
} from "@/components/FileRows"
import LabelSegments from "@/components/LabelSegments"
import OutwardLink from "@/components/OutwardLink"
import ReviewToggle from "@/components/ReviewToggle"
import type { CodeDefinitions, CodeLinkTargets, ForgeLink } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export interface WalkthroughFile {
  readonly anchorId: string
  readonly path: string
  readonly title: string
  readonly isReviewed: boolean
  readonly reviewLabel: string
  readonly countLabels: readonly string[]
  readonly forgeLink: ForgeLink | null
  readonly rootBlocks: readonly FileRootBlock[]
  readonly rows: readonly FileRow[]
  readonly threads: readonly FileThread[]
}

interface FileSectionProps {
  readonly file: WalkthroughFile
  readonly previewVisit?: PreviewVisit | null
  readonly openWaypointIds: ReadonlySet<string>
  readonly currentWaypointId: string | null
  readonly focusedWaypointId: string | null
  readonly isCollapsed: boolean
  readonly isReviewPending: boolean
  readonly composer: ComposerLabels | null
  readonly composingRange: CommentRange | null
  readonly isCommentPending: boolean
  readonly renderCommentEditor: CommentEditorRenderer
  readonly codeLinks: CodeLinkTargets
  readonly codeDefinitions: CodeDefinitions
  readonly onOpenCodeLink: (anchorId: string) => void
  readonly onToggleWaypoint: (waypointId: string) => void
  readonly onCollapsedChange: (isCollapsed: boolean) => void
  readonly onWaypointReviewedChange: ((waypointId: string, isReviewed: boolean) => void) | null
  readonly onFileReviewedChange: ((path: string, isReviewed: boolean) => void) | null
  readonly onRootBlockReviewedChange: ((rootBlockId: string, isReviewed: boolean) => void) | null
  readonly onStartComment: (path: string, address: LineAddress | null, isExtending: boolean) => void
  readonly onAddComment: (path: string, range: CommentRange, body: string) => void
  readonly onPostComment: (path: string, range: CommentRange, body: string) => void
  readonly onReply: (threadId: string, body: string) => void
  readonly onResolveThread: (threadId: string, isResolved: boolean) => void
  readonly onDiscardComment: (commentId: string) => void
  readonly onWriteUp?: ((target: WriteUpTarget) => void) | null
}

const COLLAPSE_LABEL = "Collapse file"
const EXPAND_LABEL = "Expand file"

const FileSection = ({
  file,
  previewVisit = null,
  openWaypointIds,
  currentWaypointId,
  focusedWaypointId,
  isCollapsed,
  isReviewPending,
  composer,
  composingRange,
  isCommentPending,
  renderCommentEditor,
  codeLinks,
  codeDefinitions,
  onOpenCodeLink,
  onToggleWaypoint,
  onCollapsedChange,
  onWaypointReviewedChange,
  onFileReviewedChange,
  onRootBlockReviewedChange,
  onStartComment,
  onAddComment,
  onPostComment,
  onReply,
  onResolveThread,
  onDiscardComment,
  onWriteUp = null,
}: FileSectionProps) => {
  const commenting: FileCommenting | null = composer === null
    ? null
    : { composer, composingRange, isCommentPending, renderCommentEditor, onStartComment, onAddComment, onPostComment, onReply, onResolveThread, onDiscardComment }
  return (
    <article
      id={file.anchorId}
      aria-label={file.title}
      data-reviewed={file.isReviewed}
      data-reference-scope=""
      className={cn("scroll-mt-(--waypoint-scroll-margin) pt-6", isCollapsed ? "" : "[contain-intrinsic-size:auto_32rem] [content-visibility:auto]")}
    >
      <div className="overflow-clip rounded-md border">
        <div
          data-file-header=""
          className={cn("sticky top-(--file-header-top) z-10 flex h-11 items-center gap-3 bg-muted pr-1 pl-1.5", isCollapsed ? "" : "border-b")}
        >
          <button
            type="button"
            aria-expanded={!isCollapsed}
            aria-label={`${isCollapsed ? EXPAND_LABEL : COLLAPSE_LABEL}: ${file.path}`}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => { onCollapsedChange(!isCollapsed) }}
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
          <LabelSegments
            segments={file.countLabels.map((text) => ({ text, kind: "plain" }))}
            className="hidden shrink justify-end text-xs text-muted-foreground tabular-nums md:flex"
          />
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
        <FileRows
          path={file.path}
          label={file.path}
          rows={file.rows}
          rootBlocks={file.rootBlocks}
          threads={file.threads}
          previewVisit={previewVisit}
          openWaypointIds={openWaypointIds}
          currentWaypointId={currentWaypointId}
          focusedWaypointId={focusedWaypointId}
          isCollapsed={isCollapsed}
          isReviewPending={isReviewPending}
          commenting={commenting}
          codeLinks={codeLinks}
          codeDefinitions={codeDefinitions}
          onOpenCodeLink={onOpenCodeLink}
          onToggleWaypoint={onToggleWaypoint}
          onWaypointReviewedChange={onWaypointReviewedChange}
          onRootBlockReviewedChange={onRootBlockReviewedChange}
          onWriteUp={onWriteUp}
        />
      </div>
    </article>
  )
}

export default FileSection
