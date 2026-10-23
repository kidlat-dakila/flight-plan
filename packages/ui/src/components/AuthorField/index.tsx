import Avatar from "@/components/Avatar"
import SuggestionField from "@/components/SuggestionField"

export interface AuthorOption {
  readonly id: string
  readonly name: string
  readonly detail: string
  readonly avatarUrl: string | null
  readonly monogram: string
  readonly isTaken: boolean
  readonly stateLabel: string | null
}

interface AuthorFieldProps {
  readonly label: string
  readonly hint: string
  readonly placeholder: string
  readonly query: string
  readonly options: readonly AuthorOption[]
  readonly message: string | null
  readonly errorMessage: string | null
  readonly onTroubleshoot?: (() => void) | null
  readonly onQueryChange: (query: string) => void
  readonly onOpen: () => void
  readonly onSelect: (authorId: string) => void
}

const AuthorField = ({
  label,
  hint,
  placeholder,
  query,
  options,
  message,
  errorMessage,
  onTroubleshoot = null,
  onQueryChange,
  onOpen,
  onSelect,
}: AuthorFieldProps) => (
  <SuggestionField
    label={label}
    hint={hint}
    placeholder={placeholder}
    value={query}
    suggestions={options.map((option) => ({
      id: option.id,
      label: option.name,
      detail: option.detail,
      stateLabel: option.stateLabel,
      isDisabled: option.isTaken,
      marker: <Avatar imageUrl={option.avatarUrl} monogram={option.monogram} />,
    }))}
    message={message}
    errorMessage={errorMessage}
    onTroubleshoot={onTroubleshoot}
    className="max-w-md"
    onValueChange={onQueryChange}
    onOpen={onOpen}
    onSelect={onSelect}
  />
)

export default AuthorField
