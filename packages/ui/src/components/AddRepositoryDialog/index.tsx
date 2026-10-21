import Button from "@/components/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/blocks/dialog"
import FolderBrowserDialog, { type FolderBrowser } from "@/components/FolderBrowserDialog"
import RepositoryAuthors, { type AuthorRole, type AuthorsChoice } from "@/components/RepositoryAuthors"
import SuggestionField from "@/components/SuggestionField"
import { closeUnlessSuggestionsOpen } from "@/lib/dialog-close"
import { submitHandlerOf } from "@/lib/form-submit"

export interface FolderSearch {
  readonly query: string
  readonly options: readonly {
    readonly path: string
    readonly name: string
    readonly isAdded: boolean
    readonly stateLabel: string | null
  }[]
  readonly message: string | null
}

export interface FolderBrowse {
  readonly isOpen: boolean
  readonly browser: FolderBrowser | null
  readonly errorMessage: string | null
}

interface AddRepositoryDialogProps {
  readonly isOpen: boolean
  readonly search: FolderSearch
  readonly browse: FolderBrowse
  readonly authors: AuthorsChoice
  readonly isAdding: boolean
  readonly errorMessage: string | null
  readonly onQueryChange: (query: string) => void
  readonly onChooseFolder: (path: string) => void
  readonly onAuthorQueryChange: (role: AuthorRole, query: string) => void
  readonly onAuthorSelect: (role: AuthorRole, authorId: string) => void
  readonly onTrackedAuthorRemove: (authorId: string) => void
  readonly onSubmit: () => void
  readonly onBrowse: () => void
  readonly onBrowseFolder: (path: string) => void
  readonly onBrowseClose: () => void
  readonly onClose: () => void
}

const PATH_EXAMPLE = "/Users/you/projects/storefront"

const AddRepositoryDialog = ({
  isOpen,
  search,
  browse,
  authors,
  isAdding,
  errorMessage,
  onQueryChange,
  onChooseFolder,
  onAuthorQueryChange,
  onAuthorSelect,
  onTrackedAuthorRemove,
  onSubmit,
  onBrowse,
  onBrowseFolder,
  onBrowseClose,
  onClose,
}: AddRepositoryDialogProps) => (
  <Dialog
    open={isOpen}
    onOpenChange={closeUnlessSuggestionsOpen(onClose)}
  >
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Add repository</DialogTitle>
        <DialogDescription>
          Search this machine for a folder that holds a git repository, or type its full path. Then choose the users
          Flight Plan follows in it.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submitHandlerOf(onSubmit)} className="grid gap-4">
        <SuggestionField
          label="Repository folder"
          hint={null}
          placeholder={PATH_EXAMPLE}
          value={search.query}
          suggestions={search.options.map((option) => ({
            id: option.path,
            label: option.path,
            detail: null,
            stateLabel: option.stateLabel,
            isDisabled: option.isAdded,
          }))}
          message={search.message}
          errorMessage={null}
          isLiteral
          onValueChange={onQueryChange}
          onSelect={onChooseFolder}
          onEnter={onSubmit}
        />
        <RepositoryAuthors
          authors={authors}
          onAuthorQueryChange={onAuthorQueryChange}
          onAuthorSelect={onAuthorSelect}
          onTrackedAuthorRemove={onTrackedAuthorRemove}
        />
        {errorMessage === null ? null : <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" className="sm:mr-auto" onClick={onBrowse}>Browse folders</Button>
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isAdding}>{isAdding ? "Adding…" : "Add"}</Button>
        </DialogFooter>
      </form>
      <FolderBrowserDialog
        isOpen={browse.isOpen}
        title="Browse folders"
        description="Open folders until you reach a repository, then choose it."
        browser={browse.browser}
        errorMessage={browse.errorMessage}
        onOpenFolder={onBrowseFolder}
        onChooseRepository={onChooseFolder}
        onChooseFolder={null}
        onClose={onBrowseClose}
      />
    </DialogContent>
  </Dialog>
)

export default AddRepositoryDialog
