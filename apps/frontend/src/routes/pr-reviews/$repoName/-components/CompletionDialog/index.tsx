import { useId, useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import Dialog, { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@flightplan/ui/blocks/dialog"

interface PullRequestOption {
  readonly id: string
  readonly label: string
  readonly detail: string
}

export interface PullRequestChoice {
  readonly title: string
  readonly description: string
  readonly emptyMessage: string | null
  readonly options: readonly PullRequestOption[]
  readonly selectedId: string | null
  readonly confirmLabel: string
  readonly skipLabel: string
  readonly cancelLabel: string
}

interface CompletionDialogProps {
  readonly choice: PullRequestChoice
  readonly isPending: boolean
  readonly onComplete: (pullRequestTargetId: string | null) => void
  readonly onClose: () => void
}

const CompletionDialog = ({ choice, isPending, onComplete, onClose }: CompletionDialogProps) => {
  const groupId = useId()
  const [selectedId, setSelectedId] = useState(choice.selectedId)
  return (
    <Dialog open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{choice.title}</DialogTitle>
          <DialogDescription>{choice.description}</DialogDescription>
        </DialogHeader>
        {choice.emptyMessage === null
          ? (
              <fieldset>
                <legend className="sr-only">{choice.title}</legend>
                <ul className="max-h-[60dvh] overflow-y-auto border-t border-border">
                  {choice.options.map((option) => (
                    <li key={option.id} className="border-b border-border py-3">
                      <label className="flex cursor-pointer items-start gap-3 text-base">
                        <input
                          type="radio"
                          name={groupId}
                          checked={selectedId === option.id}
                          className="mt-1 size-4 shrink-0 accent-(--primary)"
                          onChange={() => { setSelectedId(option.id) }}
                        />
                        <span className="min-w-0 font-bold">{option.label}</span>
                      </label>
                      <span className="block pl-7 text-sm text-muted-foreground">{option.detail}</span>
                    </li>
                  ))}
                </ul>
              </fieldset>
            )
          : <p className="text-muted-foreground">{choice.emptyMessage}</p>}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>{choice.cancelLabel}</Button>
          <Button type="button" variant="outline" disabled={isPending} onClick={() => { onComplete(null) }}>{choice.skipLabel}</Button>
          {choice.emptyMessage === null
            ? (
                <Button type="button" disabled={isPending || selectedId === null} onClick={() => { onComplete(selectedId) }}>
                  {choice.confirmLabel}
                </Button>
              )
            : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CompletionDialog
