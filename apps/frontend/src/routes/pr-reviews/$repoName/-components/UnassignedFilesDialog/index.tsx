import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"

export interface PublishConfirmation {
  readonly warning: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
}

interface UnassignedFilesDialogProps {
  readonly title: string
  readonly description: string
  readonly paths: readonly string[]
  readonly confirmation: PublishConfirmation | null
  readonly onClose: () => void
}

const CLOSE_LABEL = "Close"
const CANCEL_LABEL = "Cancel"

const UnassignedFilesDialog = ({ title, description, paths, confirmation, onClose }: UnassignedFilesDialogProps) => (
  <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{confirmation?.warning ?? description}</DialogDescription>
      </DialogHeader>
      <ul aria-label={title} className="grid max-h-80 gap-1 overflow-y-auto">
        {paths.map((path) => <li key={path} className="font-mono text-[0.8rem] break-all">{path}</li>)}
      </ul>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>{confirmation === null ? CLOSE_LABEL : CANCEL_LABEL}</Button>
        {confirmation === null ? null : <Button type="button" onClick={confirmation.onConfirm}>{confirmation.confirmLabel}</Button>}
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default UnassignedFilesDialog
