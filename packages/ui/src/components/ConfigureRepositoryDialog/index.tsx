import { useState } from "react"
import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"
import ProblemAlert from "@/components/ProblemAlert"
import RepositoryAuthors, { type AuthorRole, type AuthorsChoice } from "@/components/RepositoryAuthors"
import { closeUnlessSuggestionsOpen } from "@/lib/dialog-close"
import { submitHandlerOf } from "@/lib/form-submit"

interface ConfigureRepositoryDialogProps {
  readonly isOpen: boolean
  readonly name: string
  readonly path: string
  readonly configurationHref: string
  readonly authors: AuthorsChoice
  readonly isSaving: boolean
  readonly isRemoving: boolean
  readonly errorMessage: string | null
  readonly onTroubleshoot?: (() => void) | null
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorSelect: (role: AuthorRole, authorId: string) => void
  readonly onTrackedAuthorRemove: (authorId: string) => void
  readonly onSave: () => void
  readonly onRemove: () => void
  readonly onClose: () => void
}

interface ConfigureFooterProps {
  readonly name: string
  readonly isSaving: boolean
  readonly isRemoving: boolean
  readonly onRemove: () => void
  readonly onClose: () => void
}

const ConfigureFooter = ({ name, isSaving, isRemoving, onRemove, onClose }: ConfigureFooterProps) => {
  const [isConfirmingRemoval, setIsConfirmingRemoval] = useState(false)
  return isConfirmingRemoval
    ? (
        <div className="grid gap-3">
          <p>{`Remove ${name} from Flight Plan? Its folder on disk is not touched.`}</p>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setIsConfirmingRemoval(false) }}>Keep</Button>
            <Button type="button" variant="destructive" disabled={isRemoving} onClick={onRemove}>
              {isRemoving ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </div>
      )
    : (
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="sm:mr-auto"
            onClick={() => { setIsConfirmingRemoval(true) }}
          >
            Remove repository
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      )
}

const ConfigureRepositoryDialog = ({
  isOpen,
  name,
  path,
  configurationHref,
  authors,
  isSaving,
  isRemoving,
  errorMessage,
  onTroubleshoot = null,
  onAuthorQueryChange,
  onAuthorSelect,
  onTrackedAuthorRemove,
  onSave,
  onRemove,
  onClose,
}: ConfigureRepositoryDialogProps) => (
  <Dialog open={isOpen} onOpenChange={closeUnlessSuggestionsOpen(onClose)}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{`Configure ${name}`}</DialogTitle>
        <DialogDescription>Pick the team members whose work Flight Plan lists in this repository.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submitHandlerOf(onSave)} className="grid gap-4">
        <div className="grid gap-1.5">
          <p className="text-sm font-bold">Repository folder</p>
          <p className="font-mono text-[0.82rem] wrap-anywhere text-muted-foreground">{path}</p>
        </div>
        <RepositoryAuthors
          authors={authors}
          onAuthorQueryChange={onAuthorQueryChange}
          onAuthorSelect={onAuthorSelect}
          onTrackedAuthorRemove={onTrackedAuthorRemove}
        />
        <a href={configurationHref} className="w-fit text-sm underline">Prompt configurations</a>
        {errorMessage === null ? null : <ProblemAlert message={errorMessage} onTroubleshoot={onTroubleshoot} className="text-sm text-destructive" />}
        <ConfigureFooter name={name} isSaving={isSaving} isRemoving={isRemoving} onRemove={onRemove} onClose={onClose} />
      </form>
    </DialogContent>
  </Dialog>
)

export default ConfigureRepositoryDialog
