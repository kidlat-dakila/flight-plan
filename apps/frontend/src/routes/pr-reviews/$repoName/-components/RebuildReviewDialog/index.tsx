import Dialog, { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"
import StartReviewForm, { type RequestProblem, type ReviewChoice, type StartForm } from "@flightplan/ui/StartReviewForm"

export interface RebuildForm {
  readonly title: string
  readonly description: string
  readonly form: StartForm
}

interface RebuildReviewDialogProps {
  readonly isOpen: boolean
  readonly rebuildForm: RebuildForm | null
  readonly loadingLabel: string
  readonly problem: RequestProblem | null
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onSubmit: (choice: ReviewChoice) => void
  readonly onClose: () => void
}

const RebuildReviewDialog = ({
  isOpen,
  rebuildForm,
  loadingLabel,
  problem,
  errorMessage,
  isPending,
  onSubmit,
  onClose,
}: RebuildReviewDialogProps) => (
  <Dialog
    open={isOpen}
    onOpenChange={(isOpening) => {
      if (!isOpening) onClose()
    }}
  >
    <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto sm:max-w-3xl">
      {rebuildForm === null
        ? (
            <DialogHeader>
              <DialogTitle>{loadingLabel}</DialogTitle>
              {errorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
            </DialogHeader>
          )
        : (
            <>
              <DialogHeader>
                <DialogTitle>{rebuildForm.title}</DialogTitle>
                <DialogDescription className="max-w-[62ch]">{rebuildForm.description}</DialogDescription>
              </DialogHeader>
              <StartReviewForm
                form={rebuildForm.form}
                problem={problem}
                errorMessage={errorMessage}
                isPending={isPending}
                dataNotice={null}
                onSubmit={onSubmit}
              />
            </>
          )}
    </DialogContent>
  </Dialog>
)

export default RebuildReviewDialog
