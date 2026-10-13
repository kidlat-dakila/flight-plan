import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"

interface UnavailableFeatureDialogProps {
  readonly title: string
  readonly description: string
  readonly closeLabel: string
  readonly onClose: () => void
}

const UnavailableFeatureDialog = ({ title, description, closeLabel, onClose }: UnavailableFeatureDialogProps) => (
  <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button type="button" onClick={onClose}>{closeLabel}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default UnavailableFeatureDialog
