import type { MoveDirection } from "@/routes/pr-reviews/$repoName/-components/SegmentHeader"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"
import IconButton from "@flightplan/ui/IconButton"

interface ArrangedEntry {
  readonly id: string
  readonly heading: string
  readonly detailLabel: string
  readonly canMoveUp: boolean
  readonly canMoveDown: boolean
}

interface ArrangeDialogProps {
  readonly title: string
  readonly description: string
  readonly entries: readonly ArrangedEntry[]
  readonly isPending: boolean
  readonly onMove: (id: string, direction: MoveDirection) => void
  readonly onClose: () => void
}

const DONE_LABEL = "Done"

const ArrangeDialog = ({ title, description, entries, isPending, onMove, onClose }: ArrangeDialogProps) => (
  <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <ol aria-label={title} className="grid max-h-96 gap-1 overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold" title={entry.heading}>{entry.heading}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{entry.detailLabel}</span>
            </span>
            <IconButton
              icon="previous"
              label={`Move ${entry.heading} up`}
              isDisabled={!entry.canMoveUp || isPending}
              onClick={() => { onMove(entry.id, "up") }}
            />
            <IconButton
              icon="next"
              label={`Move ${entry.heading} down`}
              isDisabled={!entry.canMoveDown || isPending}
              onClick={() => { onMove(entry.id, "down") }}
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

export default ArrangeDialog
