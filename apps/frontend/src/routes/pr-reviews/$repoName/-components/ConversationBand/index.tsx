import { CommentComposer, CommentEntry, type ThreadComment } from "@flightplan/ui/CommentThread"

interface ConversationEntry extends ThreadComment {
  readonly verdictLabel: string | null
}

interface ConversationBandProps {
  readonly anchorId: string
  readonly heading: string
  readonly emptyMessage: string | null
  readonly entries: readonly ConversationEntry[]
  readonly placeholder: string
  readonly submitLabel: string
  readonly isSubmitting: boolean
  readonly onComment: (body: string) => void
}

const ConversationBand = ({
  anchorId,
  heading,
  emptyMessage,
  entries,
  placeholder,
  submitLabel,
  isSubmitting,
  onComment,
}: ConversationBandProps) => (
  <section id={anchorId} aria-labelledby={`${anchorId}-heading`} className="scroll-mt-(--section-scroll-margin) border-t pt-6 pb-8">
    <h2 id={`${anchorId}-heading`} className="pb-4 text-2xl leading-9 font-semibold tracking-[-0.02em] text-foreground">{heading}</h2>
    <div className="flex max-w-[52rem] flex-col">
      {emptyMessage === null ? null : <p className="pb-4 text-muted-foreground">{emptyMessage}</p>}
      {entries.map((entry) => (
        <CommentEntry key={entry.id} comment={entry} verdictLabel={entry.verdictLabel} className="border-t py-3 first:border-t-0 first:pt-0" />
      ))}
      <CommentComposer
        label={placeholder}
        placeholder={placeholder}
        submitLabel={submitLabel}
        cancelLabel={null}
        isSubmitting={isSubmitting}
        className="border-t pt-4"
        onSubmit={onComment}
      />
    </div>
  </section>
)

export default ConversationBand
