import { useId, useState } from "react"
import Button from "@flightplan/ui/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flightplan/ui/blocks/dialog"
import Input from "@flightplan/ui/blocks/input"

interface AddRepositoryFormProps {
  readonly errorMessage: string | null
  readonly isPending: boolean
  readonly onSubmit: (path: string) => void
  readonly onClose: () => void
}

interface AddRepositoryDialogProps extends AddRepositoryFormProps {
  readonly isOpen: boolean
}

const PATH_EXAMPLE = "/Users/you/projects/storefront"

const AddRepositoryForm = ({ errorMessage, isPending, onSubmit, onClose }: AddRepositoryFormProps) => {
  const [path, setPath] = useState("")
  const inputId = useId()
  const errorId = useId()
  const hasError = errorMessage !== null

  return (
    <form action={() => { onSubmit(path) }} className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor={inputId} className="text-sm font-bold">Repository folder</label>
        <Input
          id={inputId}
          name="path"
          value={path}
          placeholder={PATH_EXAMPLE}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError ? errorId : undefined}
          className="font-mono"
          onChange={(event) => { setPath(event.target.value) }}
        />
        {hasError ? <p id={errorId} role="alert" className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Adding…" : "Add"}</Button>
      </DialogFooter>
    </form>
  )
}

const AddRepositoryDialog = ({ isOpen, errorMessage, isPending, onSubmit, onClose }: AddRepositoryDialogProps) => (
  <Dialog open={isOpen} onOpenChange={(isNextOpen) => { if (!isNextOpen) onClose() }}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add repository</DialogTitle>
        <DialogDescription>The full path to a repository on this machine.</DialogDescription>
      </DialogHeader>
      <AddRepositoryForm errorMessage={errorMessage} isPending={isPending} onSubmit={onSubmit} onClose={onClose} />
    </DialogContent>
  </Dialog>
)

export default AddRepositoryDialog
