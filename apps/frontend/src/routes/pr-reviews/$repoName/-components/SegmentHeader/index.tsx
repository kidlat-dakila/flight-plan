import SegmentEditor, { type SegmentContent } from "@/routes/pr-reviews/$repoName/-components/SegmentEditor"
import Button from "@flightplan/ui/blocks/button"
import Unwritten from "@flightplan/ui/Unwritten"

interface ReviewKey {
  readonly repositoryName: string
  readonly targetId: string
}

export type MoveDirection = "up" | "down"

export interface SegmentWriting {
  readonly isWriting: boolean
  readonly isSaving: boolean
  readonly errorMessage: string | null
  readonly onEdit: () => void
  readonly onSave: (content: SegmentContent) => void
  readonly onCancel: () => void
}

export interface SegmentAuthoring {
  readonly writing: SegmentWriting
  readonly isPending: boolean
  readonly onRemove: () => void
}

interface SegmentOutline {
  readonly heading: string
  readonly detailLabel: string
  readonly label: string
  readonly paths: readonly string[]
  readonly canMoveUp: boolean
  readonly canMoveDown: boolean
}

interface SegmentHeaderProps {
  readonly reviewKey: ReviewKey
  readonly heading: string | null
  readonly isTitleDraft: boolean
  readonly detailLabel: string | null
  readonly outline: SegmentOutline
  readonly authoring: SegmentAuthoring | null
}

const HEADING_CLASSES = "text-[1.75rem] leading-9 font-semibold tracking-[-0.02em] text-foreground"
const DETAIL_CLASSES = "text-sm text-muted-foreground tabular-nums"
const EDIT_LABEL = "Edit segment"

const SegmentHeader = ({ reviewKey, heading, isTitleDraft, detailLabel, outline, authoring }: SegmentHeaderProps) => {
  if (authoring === null) {
    return heading === null
      ? null
      : (
          <div className="flex items-baseline gap-3 pt-6">
            <h2 className={HEADING_CLASSES}>{heading}</h2>
            <Unwritten isPending={isTitleDraft} className="w-64 self-center text-[1.75rem]">{null}</Unwritten>
            <p className={DETAIL_CLASSES}>{detailLabel}</p>
          </div>
        )
  }
  if (authoring.writing.isWriting) {
    return (
      <SegmentEditor
        reviewKey={reviewKey}
        legend={outline.heading}
        label={outline.label}
        paths={outline.paths}
        isSaving={authoring.writing.isSaving}
        isDeleting={authoring.isPending}
        errorMessage={authoring.writing.errorMessage}
        onSave={authoring.writing.onSave}
        onDelete={authoring.onRemove}
        onClose={authoring.writing.onCancel}
      />
    )
  }
  return (
    <div className="flex items-center gap-3 pt-6">
      <h2 className={HEADING_CLASSES}>{outline.heading}</h2>
      <p className={DETAIL_CLASSES}>{outline.detailLabel}</p>
      <Button variant="link" size="sm" onClick={authoring.writing.onEdit}>{EDIT_LABEL}</Button>
    </div>
  )
}

export default SegmentHeader
