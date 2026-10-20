import SuggestionField from "@flightplan/ui/SuggestionField"

export interface TargetOption {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly stateLabel: string | null
  readonly isDisabled: boolean
}

export interface CreationForm {
  readonly title: string
  readonly description: string
  readonly target: {
    readonly label: string
    readonly hint: string
    readonly placeholder: string
  }
}

export interface TargetSearch {
  readonly value: string
  readonly options: readonly TargetOption[]
  readonly message: string | null
}

interface CreateFlightPlanFormProps {
  readonly creationForm: CreationForm
  readonly targetSearch: TargetSearch
  readonly onTargetQueryChange: (query: string) => void
  readonly onTargetSelect: (targetId: string) => void
}

const CreateFlightPlanForm = ({ creationForm, targetSearch, onTargetQueryChange, onTargetSelect }: CreateFlightPlanFormProps) => (
  <div className="grid max-w-208 gap-4">
    <SuggestionField
      label={creationForm.target.label}
      hint={creationForm.target.hint}
      placeholder={creationForm.target.placeholder}
      value={targetSearch.value}
      suggestions={targetSearch.options}
      message={targetSearch.message}
      errorMessage={null}
      className="max-w-xl"
      onValueChange={onTargetQueryChange}
      onSelect={onTargetSelect}
    />
  </div>
)

export default CreateFlightPlanForm
