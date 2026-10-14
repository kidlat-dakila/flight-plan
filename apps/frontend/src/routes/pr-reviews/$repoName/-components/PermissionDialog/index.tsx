import { useId, useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"

export interface PermissionRequest {
  readonly batchId: string
  readonly questionId: string
  readonly title: string
  readonly description: string
  readonly detail: string | null
  readonly allowLabel: string
  readonly denyLabel: string
  readonly reasonLabel: string
}

interface PermissionDialogProps {
  readonly request: PermissionRequest
  readonly isAnswering: boolean
  readonly problem: string | null
  readonly onAnswer: (pickedLabel: string, reason: string | null) => void
}

const DETAIL_CLASSES = "max-h-48 overflow-auto rounded-sm bg-muted px-2 py-1.5 font-mono text-xs leading-5 whitespace-pre-wrap wrap-anywhere"
const TEXTAREA_CLASSES = "min-h-16 w-full resize-none rounded-lg border border-input bg-card px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40"

const reasonOf = (text: string): string | null => (text.trim() === "" ? null : text.trim())

const PermissionDialog = ({ request, isAnswering, problem, onAnswer }: PermissionDialogProps) => {
  const reasonId = useId()
  const [reason, setReason] = useState("")
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{request.title}</DialogTitle>
          <DialogDescription>{request.description}</DialogDescription>
        </DialogHeader>
        {request.detail === null ? null : <pre className={DETAIL_CLASSES}>{request.detail}</pre>}
        <div className="flex flex-col gap-1">
          <label htmlFor={reasonId} className="text-xs text-muted-foreground">{request.reasonLabel}</label>
          <textarea
            id={reasonId}
            value={reason}
            className={TEXTAREA_CLASSES}
            onChange={(event) => { setReason(event.target.value) }}
          />
        </div>
        {problem === null ? null : <p role="alert" className="text-sm text-destructive">{problem}</p>}
        <DialogFooter>
          <Button
            type="button"
            variant="destructive"
            disabled={isAnswering}
            onClick={() => { onAnswer(request.denyLabel, reasonOf(reason)) }}
          >
            {request.denyLabel}
          </Button>
          <Button type="button" disabled={isAnswering} onClick={() => { onAnswer(request.allowLabel, null) }}>
            {request.allowLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default PermissionDialog
