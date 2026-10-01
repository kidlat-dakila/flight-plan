import { useEffect, useRef, useState } from "react"
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
}

interface CommentComposerProps {
  readonly label: string
  readonly placeholder: string
  readonly submitLabel: string
  readonly cancelLabel: string | null
  readonly isSubmitting: boolean
  readonly shouldFocus?: boolean
  readonly className?: string
  readonly onSubmit: (body: string) => void
  readonly onCancel?: () => void
}

interface CommentEntryProps {
  readonly comment: ThreadComment
  readonly verdictLabel?: string | null
  readonly className?: string
}

interface CommentThreadProps {
  readonly comments: readonly ThreadComment[]
  readonly replyLabel: string
  readonly replyPlaceholder: string
  readonly submitLabel: string
  readonly cancelLabel: string
  readonly isSubmitting: boolean
  readonly onReply: (body: string) => void
}

const NO_CODE_LINKS = {}
const TEXTAREA_CLASSES = "min-h-16 w-full resize-y rounded-lg border border-input bg-card px-2.5 py-1.5 font-sans text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

const ignoreCodeLink = (): void => undefined

export const CommentComposer = ({
  label,
  placeholder,
  submitLabel,
  cancelLabel,
  isSubmitting,
  shouldFocus = false,
  className,
  onSubmit,
  onCancel,
}: CommentComposerProps) => {
  const [body, setBody] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (shouldFocus) textareaRef.current?.focus()
  }, [shouldFocus])

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(body)
        setBody("")
      }}
    >
      <textarea
        aria-label={label}
        placeholder={placeholder}
        value={body}
        ref={textareaRef}
        className={TEXTAREA_CLASSES}
        onChange={(event) => { setBody(event.target.value) }}
      />
      <div className="flex justify-end gap-2">
        {cancelLabel === null || onCancel === undefined
          ? null
          : <Button type="button" variant="ghost" size="sm" onClick={onCancel}>{cancelLabel}</Button>}
        <Button type="submit" size="sm" disabled={isSubmitting || body.trim() === ""}>{submitLabel}</Button>
      </div>
    </form>
  )
}

export const CommentEntry = ({ comment, verdictLabel = null, className }: CommentEntryProps) => (
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
      </p>
      <Prose blocks={comment.body} codeLinks={NO_CODE_LINKS} onOpenCodeLink={ignoreCodeLink} />
    </div>
  </article>
)

const CommentThread = ({
  comments,
  replyLabel,
  replyPlaceholder,
  submitLabel,
  cancelLabel,
  isSubmitting,
  onReply,
}: CommentThreadProps) => {
  const [isReplying, setIsReplying] = useState(false)
  return (
    <section
      aria-label={replyLabel}
      className="my-1.5 mr-4 ml-18 flex max-w-[52rem] flex-col gap-3 rounded-md border border-input bg-card p-3 font-sans whitespace-normal"
    >
      {comments.map((comment) => <CommentEntry key={comment.id} comment={comment} />)}
      {isReplying
        ? (
            <CommentComposer
              label={replyLabel}
              placeholder={replyPlaceholder}
              submitLabel={submitLabel}
              cancelLabel={cancelLabel}
              isSubmitting={isSubmitting}
              shouldFocus
              className="pl-9"
              onSubmit={(body) => {
                onReply(body)
                setIsReplying(false)
              }}
              onCancel={() => { setIsReplying(false) }}
            />
          )
        : (
            <button
              type="button"
              className="ml-9 h-8 rounded-lg border border-input bg-background px-2.5 text-left text-sm text-muted-foreground hover:bg-muted"
              onClick={() => { setIsReplying(true) }}
            >
              {replyPlaceholder}
            </button>
          )}
    </section>
  )
}

export default CommentThread
