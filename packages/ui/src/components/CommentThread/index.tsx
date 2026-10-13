import { useState, type ReactNode } from "react"
import Avatar from "@/components/Avatar"
import Button from "@/components/blocks/button"
import Prose from "@/components/Prose"
import type { ProseBlocks } from "@/lib/review-content"
import { cn } from "@/lib/utils"

export interface ThreadComment {
  readonly id: string
  readonly author: { readonly name: string, readonly avatarUrl: string | null, readonly monogram: string }
  readonly body: ProseBlocks
  readonly timeLabel: string
  readonly pendingLabel: string | null
  readonly discardLabel: string | null
}

export interface CommentEditorRequest {
  readonly label: string
  readonly shouldFocus: boolean
  readonly onChange: (markdown: string) => void
}

export type CommentEditorRenderer = (request: CommentEditorRequest) => ReactNode

export interface ThreadResolution {
  readonly label: string
  readonly isResolving: boolean
}

interface CommentComposerProps {
  readonly label: string
  readonly submitLabel: string
  readonly cancelLabel: string | null
  readonly hint?: string | null
  readonly isSubmitting: boolean
  readonly shouldFocus?: boolean
  readonly className?: string
  readonly renderEditor: CommentEditorRenderer
  readonly onSubmit: (body: string) => void
  readonly onCancel?: () => void
}

interface CommentEntryProps {
  readonly comment: ThreadComment
  readonly verdictLabel?: string | null
  readonly locationLabel?: string | null
  readonly isActionPending?: boolean
  readonly className?: string
  readonly onDiscard?: (commentId: string) => void
}

interface CommentThreadProps {
  readonly comments: readonly ThreadComment[]
  readonly label: string
  readonly rangeLabel: string | null
  readonly statusLabel: string | null
  readonly resolution: ThreadResolution | null
  readonly canReply: boolean
  readonly replyPlaceholder: string
  readonly submitLabel: string
  readonly cancelLabel: string
  readonly isSubmitting: boolean
  readonly renderEditor: CommentEditorRenderer
  readonly onReply: (body: string) => void
  readonly onResolve: (isResolved: boolean) => void
  readonly onDiscard: (commentId: string) => void
}

const NO_CODE_LINKS = {}
const SHOW_LABEL = "Show"
const HIDE_LABEL = "Hide"
const THREAD_CLASSES = "my-1.5 mr-4 ml-18 flex max-w-[52rem] flex-col gap-3 rounded-md border border-input bg-card p-3 font-sans whitespace-normal"
const QUIET_BUTTON_CLASSES = "text-xs text-muted-foreground underline decoration-1 underline-offset-[0.3em] hover:text-foreground disabled:opacity-50"

const ignoreCodeLink = (): void => undefined

export const CommentComposer = ({
  label,
  submitLabel,
  cancelLabel,
  hint = null,
  isSubmitting,
  shouldFocus = false,
  className,
  renderEditor,
  onSubmit,
  onCancel,
}: CommentComposerProps) => {
  const [body, setBody] = useState("")
  const [submissionCount, setSubmissionCount] = useState(0)

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(body.trim())
        setBody("")
        setSubmissionCount((count) => count + 1)
      }}
    >
      <div key={submissionCount}>{renderEditor({ label, shouldFocus, onChange: setBody })}</div>
      <div className="flex items-center justify-end gap-2">
        {hint === null ? null : <p className="mr-auto text-xs text-muted-foreground">{hint}</p>}
        {cancelLabel === null || onCancel === undefined
          ? null
          : <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{cancelLabel}</Button>}
        <Button type="submit" size="sm" disabled={isSubmitting || body.trim() === ""}>{submitLabel}</Button>
      </div>
    </form>
  )
}

export const CommentEntry = ({
  comment,
  verdictLabel = null,
  locationLabel = null,
  isActionPending = false,
  className,
  onDiscard,
}: CommentEntryProps) => (
  <article className={cn("grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm", className)}>
    <Avatar imageUrl={comment.author.avatarUrl} monogram={comment.author.monogram} className="mt-0.5 size-6" />
    <div className="flex min-w-0 flex-col gap-1">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-bold">{comment.author.name}</span>
        {verdictLabel === null ? null : <span>{verdictLabel}</span>}
        <span className="text-xs text-muted-foreground tabular-nums">{comment.timeLabel}</span>
        {comment.pendingLabel === null
          ? null
          : <span className="text-xs font-bold text-signal-text">{comment.pendingLabel}</span>}
        {comment.discardLabel === null || onDiscard === undefined
          ? null
          : (
              <button type="button" disabled={isActionPending} className={QUIET_BUTTON_CLASSES} onClick={() => { onDiscard(comment.id) }}>
                {comment.discardLabel}
              </button>
            )}
      </p>
      {locationLabel === null ? null : <p className="font-mono text-xs text-muted-foreground wrap-anywhere">{locationLabel}</p>}
      <Prose blocks={comment.body} codeLinks={NO_CODE_LINKS} onOpenCodeLink={ignoreCodeLink} />
    </div>
  </article>
)

const CommentThread = ({
  comments,
  label,
  rangeLabel,
  statusLabel,
  resolution,
  canReply,
  replyPlaceholder,
  submitLabel,
  cancelLabel,
  isSubmitting,
  renderEditor,
  onReply,
  onResolve,
  onDiscard,
}: CommentThreadProps) => {
  const [isReplying, setIsReplying] = useState(false)
  const [isShownWhenResolved, setIsShownWhenResolved] = useState(false)
  const isCollapsed = statusLabel !== null && !isShownWhenResolved
  return (
    <section aria-label={label} className={THREAD_CLASSES}>
      {rangeLabel === null && statusLabel === null
        ? null
        : (
            <p className="flex flex-wrap items-baseline gap-x-3 text-xs text-muted-foreground">
              {rangeLabel === null ? null : <span className="tabular-nums">{rangeLabel}</span>}
              {statusLabel === null ? null : <span className="font-bold text-foreground">{statusLabel}</span>}
              {statusLabel === null
                ? null
                : (
                    <button
                      type="button"
                      aria-expanded={!isCollapsed}
                      className={QUIET_BUTTON_CLASSES}
                      onClick={() => { setIsShownWhenResolved((isShown) => !isShown) }}
                    >
                      {isCollapsed ? SHOW_LABEL : HIDE_LABEL}
                    </button>
                  )}
            </p>
          )}
      {isCollapsed
        ? null
        : comments.map((comment) => (
            <CommentEntry key={comment.id} comment={comment} isActionPending={isSubmitting} onDiscard={onDiscard} />
          ))}
      {isCollapsed || !isReplying
        ? null
        : (
            <CommentComposer
              label={`${replyPlaceholder}, ${label}`}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              isSubmitting={isSubmitting}
              shouldFocus
              className="pl-9"
              renderEditor={renderEditor}
              onSubmit={(body) => {
                onReply(body)
                setIsReplying(false)
              }}
              onCancel={() => { setIsReplying(false) }}
            />
          )}
      {isCollapsed || isReplying || (!canReply && resolution === null)
        ? null
        : (
            <div className="ml-9 flex flex-wrap items-center gap-3">
              {canReply
                ? (
                    <button
                      type="button"
                      className="h-8 min-w-48 flex-1 rounded-lg border border-input bg-background px-2.5 text-left text-sm text-muted-foreground hover:bg-muted"
                      onClick={() => { setIsReplying(true) }}
                    >
                      {replyPlaceholder}
                    </button>
                  )
                : null}
              {resolution === null
                ? null
                : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => { onResolve(resolution.isResolving) }}
                    >
                      {resolution.label}
                    </Button>
                  )}
            </div>
          )}
    </section>
  )
}

export default CommentThread
