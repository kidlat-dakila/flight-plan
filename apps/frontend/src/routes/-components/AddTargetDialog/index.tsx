import Button from "@flightplan/ui/blocks/button"
import Dialog, {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@flightplan/ui/blocks/dialog"
import { closeUnlessSuggestionsOpen } from "@flightplan/ui/lib/dialog-close"
import SuggestionField from "@flightplan/ui/SuggestionField"

export interface TargetOption {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly stateLabel: string | null
  readonly isDisabled: boolean
}

export interface AddableTargetSearch {
  readonly query: string
  readonly options: readonly TargetOption[]
  readonly message: string | null
}

interface AddTargetDialogProps {
  readonly title: string
  readonly search: AddableTargetSearch
  readonly errorMessage: string | null
  readonly onQueryChange: (query: string) => void
  readonly onSelect: (targetId: string) => void
  readonly onClose: () => void
}

const DESCRIPTION = "Search the local and remote branches. A branch with an open pull request is added as that pull request."
const FIELD_LABEL = "Branch"
const FIELD_PLACEHOLDER = "Search branches and pull requests"

const AddTargetDialog = ({ title, search, errorMessage, onQueryChange, onSelect, onClose }: AddTargetDialogProps) => (
  <Dialog open onOpenChange={closeUnlessSuggestionsOpen(onClose)}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{DESCRIPTION}</DialogDescription>
      </DialogHeader>
      <SuggestionField
        label={FIELD_LABEL}
        hint={null}
        placeholder={FIELD_PLACEHOLDER}
        value={search.query}
        suggestions={search.options}
        message={search.message}
        errorMessage={errorMessage}
        onValueChange={onQueryChange}
        onSelect={onSelect}
      />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
)

export default AddTargetDialog
