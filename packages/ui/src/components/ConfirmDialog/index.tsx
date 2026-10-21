import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"

interface ConfirmDialogProps {
  readonly title: string
  readonly description: string
  readonly confirmLabel: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

const CANCEL_LABEL = "Cancel"

const ConfirmDialog = ({ title, description, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) => (
  <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>{CANCEL_LABEL}</Button>
        <Button type="button" variant="destructive" onClick={onConfirm}>{confirmLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default ConfirmDialog
