import type { MoveDirection } from "@/routes/pr-reviews/$repoName/-components/SegmentHeader"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"
import IconButton from "@flightplan/ui/IconButton"

interface ArrangedSegment {
  readonly id: string
  readonly heading: string
  readonly detailLabel: string
  readonly canMoveUp: boolean
  readonly canMoveDown: boolean
}

interface ArrangeSegmentsDialogProps {
  readonly segments: readonly ArrangedSegment[]
  readonly isPending: boolean
  readonly onMove: (segmentId: string, direction: MoveDirection) => void
  readonly onClose: () => void
}

const TITLE = "Arrange segments"
const DESCRIPTION = "Move a segment up or down. The order is saved as you go."
const DONE_LABEL = "Done"

const ArrangeSegmentsDialog = ({ segments, isPending, onMove, onClose }: ArrangeSegmentsDialogProps) => (
  <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{TITLE}</DialogTitle>
        <DialogDescription>{DESCRIPTION}</DialogDescription>
      </DialogHeader>
      <ol aria-label={TITLE} className="grid max-h-96 gap-1 overflow-y-auto">
        {segments.map((segment) => (
          <li key={segment.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold" title={segment.heading}>{segment.heading}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{segment.detailLabel}</span>
            </span>
            <IconButton
              icon="previous"
              label={`Move ${segment.heading} up`}
              isDisabled={!segment.canMoveUp || isPending}
              onClick={() => { onMove(segment.id, "up") }}
            />
            <IconButton
              icon="next"
              label={`Move ${segment.heading} down`}
              isDisabled={!segment.canMoveDown || isPending}
              onClick={() => { onMove(segment.id, "down") }}
            />
          </li>
        ))}
      </ol>
      <DialogFooter>
        <Button type="button" onClick={onClose}>{DONE_LABEL}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default ArrangeSegmentsDialog
